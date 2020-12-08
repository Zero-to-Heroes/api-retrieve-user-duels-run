import SqlString from 'sqlstring';

export const groupByFunction = (keyExtractor: (obj: object | string) => string) => array =>
	array.reduce((objectsByKeyValue, obj) => {
		const value = keyExtractor(obj);
		objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj);
		return objectsByKeyValue;
	}, {});

export const buildCondition = (userIds: readonly string[]): string => {
	return `(${userIds.map(userId => "'" + userId + "'").join(',')})`;
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
			UNION ALL SELECT '${userId}'
		`;
	console.log('user select query', userSelectQuery);
	const userIds: any[] = await mysql.query(userSelectQuery);
	console.log('got userIds', userIds);
	return userIds.map(result => result.userId);
};
