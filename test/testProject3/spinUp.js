import { MongoClient } from "mongodb";
import { queryAndMatchArray, runMutation, nextConnectionString } from "../testUtil";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { createGraphqlSchema } from "../../src/module";
import path from "path";
import glob from "glob";
import fs from "fs";

import * as projectSetupC from "./projectSetup";

export async function create() {
  await createGraphqlSchema(projectSetupC, path.resolve("./test/testProject3"));

  if (true || process.env.InCI) {
    glob.sync("./test/testProject3/graphQL/**/resolver.js").forEach(f => {
      let newFile = fs.readFileSync(f, { encoding: "utf8" }).replace(/"mongo-graphql-starter"/, `"../../../../src/module"`);
      fs.writeFileSync(f, newFile);
    });
  }
}

export default async function () {
  await create();

  const [{ default: resolvers }, { default: typeDefs }] = await Promise.all([import("./graphQL/resolver"), import("./graphQL/schema")]);

  let db, schema;
  let client = await MongoClient.connect(nextConnectionString(), { useNewUrlParser: true, useUnifiedTopology: true });
  db = client.db(process.env.databaseName || "mongo-graphql-starter");
  schema = makeExecutableSchema({ typeDefs, resolvers, initialValue: { db: {} } });

  return {
    db,
    schema,
    close: () => client.close(),
    queryAndMatchArray: options => queryAndMatchArray({ schema, db, ...options }),
    runMutation: options => runMutation({ schema, db, ...options })
  };
}
