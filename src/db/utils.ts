import SqlString from 'sqlstring';

export const buildCondition = (userIds: readonly string[]): string => {
	return `(${userIds.map((userId) => "'" + userId + "'").join(',')})`;
};

export const getValidUserInfo = async (userId: string, userName: string, mysql): Promise<readonly string[]> => {
	const escape = SqlString.escape;
	const userSelectQuery = `
			SELECT DISTINCT userId FROM user_mapping
			INNER JOIN (
				SELECT DISTINCT username FROM user_mapping
				WHERE 
					(username = ${escape(userName)} OR username = ${escape(userId)} OR userId = ${escape(userId)})
					AND username IS NOT NULL
					AND username != ''
					AND username != 'null'
					AND userId != ''
					AND userId IS NOT NULL
					AND userId != 'null'
			) AS x ON x.username = user_mapping.username
			UNION ALL SELECT ${escape(userId)}
		`;
	console.debug('running query', userSelectQuery);
	const userIds: any[] = await mysql.query(userSelectQuery);
	console.debug('got user result', userIds.length);
	return userIds.map((result) => result.userId);
};
