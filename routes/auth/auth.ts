import { Router } from "express";
import { createApolloFetch } from "apollo-fetch";

export const authRouter = Router();

authRouter.get("/auth", (request, response) => {
    response.send("Auth");
});
