'use server'

import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  mapStoredMessagesToChatMessages,
  StoredMessage,
} from "@langchain/core/messages";
import { execute } from "./database";
import { customerTable, orderTable } from "./constants";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export async function message(messages: StoredMessage[]) {
  const deserialized = mapStoredMessagesToChatMessages(messages);

   const getFromDB = tool(
    async (input) => {
      if (input?.sql) {
        console.log({ sql: input.sql });

        const result = await execute(input.sql);

        return JSON.stringify(result);
      }
      return null;
    },
    {
      name: "get_from_db",
      description: `Get data from a database, the database has the following schema:
  
      ${orderTable}
      ${customerTable}  
      `,
      schema: z.object({
        sql: z
          .string()
          .describe(
            "SQL query to get data from a SQL database. Always put quotes around the field and table arguments."
          ),
      }),
    }
  );
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    maxOutputTokens: 2048,
  });
  const agent = createReactAgent({
    llm: model,
    tools: [getFromDB],
  });

  const response = await agent.invoke({
    messages: deserialized,
  });

  return response.messages[response.messages.length - 1].content;
}


