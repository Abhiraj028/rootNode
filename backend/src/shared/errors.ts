export class AppError extends Error {
    name: string;
    status: number;
    constructor(message: string, status: number){
        super(message);
        this.status = status;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string){
        super(message, 400);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string){
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string){
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string){
        super(message, 404);
    }
}

export class ServerError extends AppError {
    constructor(message: string){
        super(message, 500);
    }
}

export class ConflictError extends AppError {
    constructor(message: string){
        super(message, 409);
    }
}