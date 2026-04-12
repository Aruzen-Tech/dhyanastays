export type RequestUser = {
    sub: string;
    role: string;
    email: string;
};
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
