/* eslint-disable @typescript-eslint/no-use-before-define */
import { buildCondition, getValidUserInfo } from './db/utils';
import { DuelsRunInfo } from './duels-run-info';

export const loadStepResults = async (mysql, input): Promise<readonly DuelsRunInfo[]> => {
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
	return results;
};
