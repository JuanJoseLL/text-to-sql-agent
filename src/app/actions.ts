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
      description: `Use this tool ONLY when you need to query the database to answer a user's question about customers or orders.
      Input MUST be a valid SQLite SQL query string.
      The tool executes the provided SQL query against a database with the following schema and returns the results as a JSON string:
  
      ${orderTable}
      ${customerTable}  
      Do NOT use this tool if the user is just chatting or asking for the SQL query itself. Use it to FETCH DATA.
      `,
      schema: z.object({
        sql: z
          .string()
          .describe(
            "The **complete** and valid SQLite SQL query required to fetch the data needed to answer the user. Always enclose table and column names in double quotes (e.g., SELECT column FROM table)."
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


