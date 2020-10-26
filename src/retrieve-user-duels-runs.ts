/* eslint-disable @typescript-eslint/no-use-before-define */
import { gzipSync } from 'zlib';
import { getConnection } from './db/rds';
import { DuelsRunInfo } from './duels-run-info';
import { Input } from './input';

// This example demonstrates a NodeJS 8.10 async handler[1], however of course you could use
// the more traditional callback-style handler.
// [1]: https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/
export default async (event): Promise<any> => {
	const headers = {
		'Access-Control-Allow-Headers':
			'Accept,Accept-Language,Content-Language,Content-Type,Authorization,x-correlation-id,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
		'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT',
		'Access-Control-Allow-Origin': event.headers.Origin || event.headers.origin,
	};
	try {
		console.log('processing event');
		// Preflight
		if (!event.body) {
			const response = {
				statusCode: 200,
				body: null,
				headers: headers,
			};
			console.log('sending back success response without body', response);
			return response;
		}

		const input: Input = JSON.parse(event.body);
		const mysql = await getConnection();
		const userIds = await getValidUserInfo(input.userId, input.userName, mysql);

		const query = `
			SELECT * FROM dungeon_run_loot_info
			WHERE adventureType IN ('duels', 'paid-duels')
			AND userId IN ${buildCondition(userIds)}	
		`;
		console.log('running query', query);
		const dbResults: readonly any[] = await mysql.query(query);
		console.log('executed query', dbResults && dbResults.length, dbResults && dbResults.length > 0 && dbResults[0]);

		const results =
			!dbResults || dbResults.length === 0
				? []
				: dbResults.map(
						result =>
							({
								...result,
								creationTimestamp: Date.parse(result.creationDate),
							} as DuelsRunInfo),
				  );
		console.log('results', results);

		const stringResults = JSON.stringify({ results });
		const gzippedResults = gzipSync(stringResults).toString('base64');
		console.log('compressed', stringResults.length, gzippedResults.length);
		const response = {
			statusCode: 200,
			isBase64Encoded: true,
			body: gzippedResults,
			headers: {
				'Content-Type': 'text/html',
				'Content-Encoding': 'gzip',
			},
		};
		console.log('sending back success reponse');
		return response;
	} catch (e) {
		console.error('issue getting runs info', e);
		const response = {
			statusCode: 500,
			isBase64Encoded: false,
			body: null,
			headers: headers,
		};
		console.log('sending back error reponse', response);
		return response;
	}
};

const buildCondition = (userIds: readonly string[]): string => {
	return `(${userIds.map(userId => "'" + userId + "'").join(',')})`;
};

const getValidUserInfo = async (userId: string, userName: string, mysql): Promise<readonly string[]> => {
	const userSelectQuery = `
		SELECT DISTINCT userId FROM user_mapping
		INNER JOIN (
			SELECT DISTINCT username FROM user_mapping
			WHERE 
				(username = '${userName}' OR username = '${userId}' OR userId = '${userId}')
				AND username IS NOT NULL
				AND username != ''
				AND username != 'null'
				AND userId != ''
				AND userId IS NOT NULL
				AND userId != 'null'
		) AS x ON x.username = user_mapping.username
		UNION ALL SELECT '${userId}'
	`;
	console.log('user select query', userSelectQuery);
	const userIds: any[] = await mysql.query(userSelectQuery);
	console.log('got userIds', userIds);
	return userIds.map(result => result.userId);
};
