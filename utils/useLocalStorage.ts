import { useState, useEffect } from "react";

function getStorageValue<T>(key: string, defaultValue: T) {
	// getting stored value

	const nil = defaultValue ?? null;

	const saved = localStorage.getItem(key);

	console.log("获取", saved, nil);

	if (saved === null) return nil;
	const initial = JSON.parse(saved);
	return initial ?? nil;
}

/**
 * if defaultValue is undefined, return null。
 * JSON.stringify 不支持undefined，就算传进来 undefined(或者没有传,且localStorage没有存过) ，返回的也是 null
 * 返回的值会与实际值同步，含义就是 没有传defaultValue,且localStorage没有存过，那会在localStorage中存null
 * @param key
 * @param defaultValue
 */
export const useLocalStorage = <T = string>(key: string, defaultValue?: T) => {
	// JSON.stringify 不支持undefined，就算传进来 undefined(或者没有传,且localStorage没有存过) ，返回的也是 null

	const [value, setValue] = useState<T extends undefined ? never : T | null>(
		getStorageValue(key, defaultValue),
	);

	useEffect(() => {
		console.log("设置", value, key);
		localStorage.setItem(key, JSON.stringify(value));
	}, [key, value]);

	return [value, setValue] as const;
};
