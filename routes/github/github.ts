import { Router } from "express";

export const githubRouter = Router();

githubRouter.get("/github/auth", async (resquest, response) => {
    response.status(200);
    response.send({
        message: "GitHUB",
    });
});
