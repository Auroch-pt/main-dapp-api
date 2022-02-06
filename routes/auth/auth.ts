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
        headers: {
            "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET,
        },
    }),
    cache: new InMemoryCache(),
});

type User = {
    address: string;
    nonce: number;
};

export const authRouter = Router();

const getUser = async (address: string): Promise<User | null> => {
    type UserQuery = {
        user: User;
    };

    const user = await client
        .query<UserQuery, { address: string }>({
            query: gql`
                query user($address: String!) {
                    user(address: $address) {
                        address
                        nonce
                    }
                }
            `,
            variables: {
                address: address,
            },
            fetchPolicy: "no-cache",
        })
        .then((result) => {
            const { data } = result;

            return data.user;
        });

    if (!user) {
        const newUser = await createUser(address);

        return newUser;
    }

    return user;
};

const createUser = async (address: string): Promise<User | null> => {
    type UserMutation = {
        insertUser: User;
    };

    const nonce = gerenateNonce();

    const newUser = await client
        .mutate<UserMutation, User>({
            mutation: gql`
                mutation user($address: String!, $nonce: Int!) {
                    insertUser(object: { address: $address, nonce: $nonce }) {
                        nonce
                        address
                    }
                }
            `,
            variables: {
                address,
                nonce,
            },
            fetchPolicy: "no-cache",
        })
        .then((result) => {
            const { data, errors } = result;

            if (errors) {
                return null;
            }

            return data!.insertUser;
        });

    return newUser;
};

const updateUserNonce = async (address: string) => {
    const nonce = gerenateNonce();

    await client
        .mutate<{}, User>({
            mutation: gql`
                mutation updateNonce($address: String!, $nonce: Int!) {
                    updateUser(
                        pk_columns: { address: $address }
                        _set: { nonce: $nonce }
                    ) {
                        nonce
                    }
                }
            `,
            variables: {
                address,
                nonce,
            },
            fetchPolicy: "no-cache",
        })
        .then((result) => result.data);
};

const gerenateNonce = (): number => {
    const nonce = Math.floor(Math.random() * 1000000);

    return nonce;
};

authRouter.get("/auth/:walletAddress/nonce", async (request, response) => {
    const walletAddress = request.params["walletAddress"];

    const isValid = isValidChecksumAddress(walletAddress);

    if (!isValid) {
        response.status(401);
        response.send("address not valid");

        return;
    }

    const user = await getUser(walletAddress);

    if (!user) {
        response.status(401);
        response.send("error getting or creating the user");

        return;
    }

    response.status(200);
    response.send(user);
});

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

        const user = await getUser(walletAddress);

        if (user) {
            const msg = `Nonce: ${user.nonce}`;
            const msgHex = bufferToHex(Buffer.from(msg));
            const msgBuffer = toBuffer(msgHex);
            const msgHash = hashPersonalMessage(msgBuffer);
            const singatureParams = fromRpcSig(signature);
            const publicKey = ecrecover(
                msgHash,
                singatureParams.v,
                singatureParams.r,
                singatureParams.s
            );
            const addressBuffer = publicToAddress(publicKey);
            const address = bufferToHex(addressBuffer);

            if (address.toLowerCase() === walletAddress.toLowerCase()) {
                await updateUserNonce(walletAddress);

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
