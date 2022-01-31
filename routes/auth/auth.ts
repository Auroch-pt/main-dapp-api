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

type User = {
    insertUser: {
        address: string;
        createdAt: Date;
        nonce: string;
        signature: string;
        updatedAt: Date;
        __typename: "users";
    };
};

export const authRouter = Router();

authRouter.get(
    "/auth/:walletAddress/nonce",
    async (request, response, next) => {
        const walletAddress = request.params["walletAddress"];

        const user = await client
            .mutate<User, { address: string; nonce: number }>({
                mutation: gql`
                    mutation user($address: String!, $nonce: Int!) {
                        insertUser(
                            object: { address: $address, nonce: $nonce }
                            on_conflict: {
                                constraint: users_pkey
                                update_columns: nonce
                            }
                        ) {
                            updatedAt
                            signature
                            nonce
                            createdAt
                            address
                        }
                    }
                `,
                variables: {
                    address: walletAddress,
                    nonce: Math.floor(Math.random() * 1000000),
                },
            })
            .then((result) => {
                const { data, errors } = result;

                if (errors) {
                    response.status(401);
                    response.send(errors[0].message);

                    next(response);
                }

                return data!.insertUser;
            });

        response.status(200);
        response.send(user);
    }
);
