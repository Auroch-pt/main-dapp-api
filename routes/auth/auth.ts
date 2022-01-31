import { Router } from "express";
import { ApolloClient, InMemoryCache, gql } from "@apollo/client/core";
import "dotenv/config";

const client = new ApolloClient({
    uri: process.env.HASURA_URI,
    cache: new InMemoryCache(),
});

export const authRouter = Router();

authRouter.get("/auth/:walletAddress", async (request, response) => {
    const walletAddress = request.params["walletAddress"];

    const user = client
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
