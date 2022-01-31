import { Router } from "express";
import {
    ApolloClient,
    InMemoryCache,
    gql,
    HttpLink,
} from "@apollo/client/core";
import fetch from "cross-fetch";
import jwt from "jsonwebtoken";
import {
    isValidChecksumAddress,
    bufferToHex,
    toBuffer,
    hashPersonalMessage,
    fromRpcSig,
    ecrecover,
    publicToAddress,
} from "ethereumjs-util";
import "dotenv/config";

const client = new ApolloClient({
    link: new HttpLink({
        uri: process.env.HASURA_URI,
        fetch,
    }),
    cache: new InMemoryCache(),
});

type IUser = {
    insertUser: {
        address: string;
        createdAt: Date;
        nonce: number;
        updatedAt: Date;
        __typename: "users";
    };
};

export const authRouter = Router();

authRouter.get("/auth/:walletAddress/nonce", async (request, response) => {
    const walletAddress = request.params["walletAddress"];

    const isValid = isValidChecksumAddress(walletAddress);

    if (!isValid) {
        response.status(401);
        response.send("address not valid");

        return;
    }

    const user = await client
        .mutate<IUser, { address: string; nonce: number }>({
            mutation: gql`
                mutation user($address: String!, $nonce: Int!) {
                    insertUser(
                        object: { address: $address, nonce: $nonce }
                        on_conflict: {
                            constraint: users_pkey
                            update_columns: address
                        }
                    ) {
                        updatedAt
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

                return;
            }

            return data!.insertUser;
        });

    response.status(200);
    response.send(user);
});

type QUser = {
    user: {
        address: string;
        createdAt: Date;
        nonce: number;
        updatedAt: Date;
        __typename: "users";
    };
};

authRouter.get(
    "/auth/:walletAddress/signature/:signature",
    async (request, response) => {
        const walletAddress = request.params["walletAddress"];
        const signature = request.params["signature"];

        const isValid = isValidChecksumAddress(walletAddress);

        if (!isValid) {
            response.status(401);
            response.send("address not valid");

            return;
        }

        const user = await client
            .query<QUser, { address: string }>({
                query: gql`
                    query user($address: String!) {
                        user(address: $address) {
                            address
                            createdAt
                            nonce
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
                    response.status(401);
                    response.send(error.message);

                    return;
                }

                return data.user;
            });

        if (user) {
            const msg = `Nonce: ${user.nonce}`;
            const msgHex = bufferToHex(Buffer.from(msg));
            const msgBuffer = toBuffer(msgHex);
            const msgHash = hashPersonalMessage(msgBuffer);
            const signatureBuffer = toBuffer(signature);
            const singatureParams = fromRpcSig(signatureBuffer);
            const publicKey = ecrecover(
                msgHash,
                singatureParams.v,
                singatureParams.r,
                singatureParams.s
            );
            const addressBuffer = publicToAddress(publicKey);
            const address = bufferToHex(addressBuffer);

            if (address.toLowerCase() === walletAddress.toLowerCase()) {
                await client
                    .mutate({
                        mutation: gql`
                            mutation updateNonce(
                                $address: String!
                                $nonce: Int!
                            ) {
                                updateUser(
                                    pk_columns: { address: $address }
                                    _set: { nonce: $nonce }
                                ) {
                                    nonce
                                }
                            }
                        `,
                        variables: {
                            address: walletAddress,
                            nonce: Math.floor(Math.random() * 1000000),
                        },
                    })
                    .then((result) => {
                        const { errors } = result;

                        if (errors) {
                            response.status(401);
                            response.send(errors[0].message);

                            return;
                        }
                    });

                const token = jwt.sign(
                    {
                        address: user.address,
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: "6h" }
                );

                response.status(200).json({
                    token: `Bearer ${token}`,
                    user,
                });
            } else {
                response.status(401).send("Invalid credentials");
            }
        } else {
            response.send("User does not exist");
        }
    }
);
