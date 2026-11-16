import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { CloneHistoryItem, CloneRequest, CloneResult, ErrorResponse, HealthStatus } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * Returns server health status
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * Fetches a URL and extracts all HTML, CSS, images, and scripts
 * @summary Clone a web page
 */
export declare const getClonePageUrl: () => string;
export declare const clonePage: (cloneRequest: CloneRequest, options?: RequestInit) => Promise<CloneResult>;
export declare const getClonePageMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof clonePage>>, TError, {
        data: BodyType<CloneRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof clonePage>>, TError, {
    data: BodyType<CloneRequest>;
}, TContext>;
export type ClonePageMutationResult = NonNullable<Awaited<ReturnType<typeof clonePage>>>;
export type ClonePageMutationBody = BodyType<CloneRequest>;
export type ClonePageMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Clone a web page
 */
export declare const useClonePage: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof clonePage>>, TError, {
        data: BodyType<CloneRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof clonePage>>, TError, {
    data: BodyType<CloneRequest>;
}, TContext>;
/**
 * Returns a list of recently cloned pages
 * @summary Get clone history
 */
export declare const getGetCloneHistoryUrl: () => string;
export declare const getCloneHistory: (options?: RequestInit) => Promise<CloneHistoryItem[]>;
export declare const getGetCloneHistoryQueryKey: () => readonly ["/api/clone/history"];
export declare const getGetCloneHistoryQueryOptions: <TData = Awaited<ReturnType<typeof getCloneHistory>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCloneHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCloneHistory>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCloneHistoryQueryResult = NonNullable<Awaited<ReturnType<typeof getCloneHistory>>>;
export type GetCloneHistoryQueryError = ErrorType<unknown>;
/**
 * @summary Get clone history
 */
export declare function useGetCloneHistory<TData = Awaited<ReturnType<typeof getCloneHistory>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCloneHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map