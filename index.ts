import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth/auth";
const app = express();
app.use(cors());

app.get("/", (req, res) => {
    res.send("Hello from Express and Typescript");
});

app.use(authRouter);

const port = process.env.PORT || "3030";

app.listen(port, () => console.log(`App listening on PORT ${port}`));
