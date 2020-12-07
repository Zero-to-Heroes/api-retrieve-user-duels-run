/* eslint-disable @typescript-eslint/no-use-before-define */
import { gzipSync } from 'zlib';
import { getConnection } from './db/rds';
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

		const results = await loadStepResults(mysql, input);
		const rewardsResults = await loadRewardsResults(mysql, input);
		await mysql.end();

		const stringResults = JSON.stringify({ results, rewardsResults });
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
