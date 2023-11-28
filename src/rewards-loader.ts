/* eslint-disable @typescript-eslint/no-use-before-define */
import { buildCondition, getValidUserInfo, groupByFunction } from './db/utils';
import { DuelsRewardsInfo } from './duels-rewards-info';

export const loadRewardsResults = async (mysql, input): Promise<readonly DuelsRewardsInfo[]> => {
	const userIds = await getValidUserInfo(input.userId, input.userName, mysql);
	const query = `
			SELECT * FROM dungeon_run_rewards
			WHERE adventureType IN ('duels', 'paid-duels')
			AND creationDate >= '2020-12-07 10:00:00'
			AND userId IN ${buildCondition(userIds)}	
		`;
	console.debug('running query', query);
	const dbResults: readonly DbResult[] = await mysql.query(query);
	console.debug('got result');
	await mysql.end();

	if (!dbResults || dbResults.length === 0) {
		return [];
	}

	// Now filter by runId to keep only the data with the most recent timestamp
	const groupedByRunId: { [runId: string]: readonly DbResult[] } = groupByFunction(
		(dbResult: DbResult) => dbResult.runId,
	)(dbResults);
	const finalDbResults: DbResult[] = Object.values(groupedByRunId)
		.map((runs: readonly DbResult[]) => {
			const latestEntry = Math.max(
				...runs.map((run) => run.creationDate).map((creationDate) => Date.parse(creationDate)),
			);
			return runs.filter((run) => Date.parse(run.creationDate) === latestEntry);
		})
		.reduce((a, b) => a.concat(b), []);
	console.debug('grouped by run');
	const results = finalDbResults.map(
		(result) =>
			({
				...result,
				creationTimestamp: Date.parse(result.creationDate),
			} as DuelsRewardsInfo),
	);
	return results;
};

interface DbResult {
	readonly id: number;
	readonly adventureType: 'duels' | 'paid-duels';
	readonly creationDate: string;
	readonly userId: string;
	readonly userName: string;
	readonly reviewId: string;
	readonly runId: string;
	readonly rewardType: number;
	readonly rewardAmount: number;
	readonly rewardBoosterId: string;
	readonly wins: number;
	readonly losses: number;
	readonly rating: number;
}
