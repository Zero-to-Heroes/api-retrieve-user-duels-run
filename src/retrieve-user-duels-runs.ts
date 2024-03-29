/* eslint-disable @typescript-eslint/no-use-before-define */
import { getConnectionReadOnly } from '@firestone-hs/aws-lambda-utils';
import { gzipSync } from 'zlib';
import { getValidUserInfo } from './db/utils';
import { Input } from './input';
import { loadRewardsResults } from './rewards-loader';
import { loadStepResults } from './step-loader';

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
	// Preflight
	if (!event.body) {
		const response = {
			statusCode: 200,
			body: null,
			headers: headers,
		};
		return response;
	}

	const input: Input = JSON.parse(event.body);
	const mysql = await getConnectionReadOnly();

	const userIds = await getValidUserInfo(input.userId, input.userName, mysql);
	const [results, rewardsResults] = await Promise.all([
		loadStepResults(mysql, input, userIds),
		loadRewardsResults(mysql, input, userIds),
	]);
	await mysql.end();
	console.debug('loaded DB data', results?.length, rewardsResults?.length);

	const stringResults = JSON.stringify({ results, rewardsResults });
	const gzippedResults = gzipSync(stringResults).toString('base64');
	console.debug('sending results');
	const response = {
		statusCode: 200,
		isBase64Encoded: true,
		body: gzippedResults,
		headers: {
			'Content-Type': 'text/html',
			'Content-Encoding': 'gzip',
		},
	};
	return response;
};
