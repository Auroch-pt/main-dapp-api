import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth/auth";
import { githubRouter } from "./routes/github/github";
import "dotenv/config";

const app = express();
app.use(cors());

app.get("/", (req, res) => {
    res.send("Hello from Express and Typescript");
});

app.use(authRouter);
app.use(githubRouter);

const port = process.env.PORT || "3030";

app.listen(port, () => console.log(`App listening on PORT ${port}`));
