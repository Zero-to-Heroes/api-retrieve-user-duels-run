/* eslint-disable @typescript-eslint/no-use-before-define */
import { buildCondition, getValidUserInfo } from './db/utils';
import { DuelsRunInfo } from './duels-run-info';

export const loadStepResults = async (mysql, input): Promise<readonly DuelsRunInfo[]> => {
	const userIds = await getValidUserInfo(input.userId, input.userName, mysql);

	// Limit to the last 6 months to reduce the total data load
	const query = `
		SELECT *
		FROM dungeon_run_loot_info
		WHERE adventureType IN ('duels', 'paid-duels')
		AND userId IN ${buildCondition(userIds)}
		AND creationDate >= DATE_SUB(NOW(), INTERVAL 4 MONTH)
	`;
	console.debug('running query', query);
	const dbResults: readonly any[] = await mysql.query(query);
	console.debug('got result');

	const results =
		!dbResults || dbResults.length === 0
			? []
			: dbResults.map(
					(result) =>
						({
							...result,
							creationTimestamp: Date.parse(result.creationDate),
						} as DuelsRunInfo),
			  );
	return results;
};
