import { Router } from "express";
import { App } from "@octokit/app";

export const githubRouter = Router();

const app = new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
});

githubRouter.get("/github/auth", async (resquest, response) => {
    response.status(200);
    response.send({
        message: "GitHUB",
    });
});
