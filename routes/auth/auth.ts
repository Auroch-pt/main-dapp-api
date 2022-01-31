import { Router } from "express";
import {
    ApolloClient,
    InMemoryCache,
    gql,
    HttpLink,
} from "@apollo/client/core";
import fetch from "cross-fetch";
import "dotenv/config";

const client = new ApolloClient({
    link: new HttpLink({
        uri: process.env.HASURA_URI,
        fetch,
    }),
    cache: new InMemoryCache(),
});

export const authRouter = Router();

authRouter.get("/auth/:walletAddress", async (request, response) => {
    const walletAddress = request.params["walletAddress"];

    const user = await client
        .query({
            query: gql`
                query getUser($address: String!) {
                    user(address: $address) {
                        address
                        createdAt
                        nonce
                        signature
                        updatedAt
                    }
                }
            `,
            variables: {
                address: walletAddress,
            },
        })
        .then((result) => {
            const { data, error } = result;
            if (error) {
                return error;
            }

            return data;
        });

    response.send(user);
});
