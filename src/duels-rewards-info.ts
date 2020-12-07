export interface DuelsRewardsInfo {
	readonly adventureType: 'duels' | 'paid-duels';
	readonly creationTimestamp: number;
	readonly reviewId: string;
	readonly runId: string;
	readonly rewardType: number;
	readonly rewardAmount: number;
	readonly rewardBoosterId: number;
}
