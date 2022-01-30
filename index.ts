import express from "express";
const app = express();

app.get("/", (req, res) => {
    res.send("Hello from Express and Typescript");
});

const port = process.env.PORT || "3030";

app.listen(port, () => console.log(`App listening on PORT ${port}`));
