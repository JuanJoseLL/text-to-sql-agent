"use client";

import { useEffect, useState } from "react";
import {
  HumanMessage,
  SystemMessage,
  BaseMessage,
  AIMessage,
  mapChatMessagesToStoredMessages,
} from "@langchain/core/messages";
import { message } from "./actions";
import { seed } from "./database";

export default function Home() {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<BaseMessage[]>([
    new SystemMessage(`
      You are a helpful AI assistant designed to answer questions by querying a database.
      Your primary goal is to provide the user with **information retrieved from the database**, not just the SQL query itself.

      You have access to a tool called "getFromDB".

      **Your Workflow:**
      1.  Analyze the user's request.
      2.  Determine if you need information from the database (about customers or orders) to answer the question.
      3.  **If database information is needed:**
          a.  Formulate the correct SQLite SQL query based on the available schema (provided in the "getFromDB" tool description).
          b.  **CRITICAL:** You **MUST** use the "getFromDB" tool. Invoke it with the SQL query you generated.
          c.  Wait for the tool to return the data (as a JSON string).
          d.  Formulate your final response to the user **based on the data returned by the tool**. Summarize or present the data clearly.
      4.  **If database information is NOT needed** (e.g., greeting, general chat, user asks *for* the SQL query): Respond directly without using the tool.

      **Important Rules:**
      *   **DO NOT** give the SQL query as your final answer unless the user explicitly asks "What SQL query would you use?" or similar. Your main job is to provide the *data*.
      *   **ALWAYS** use the "getFromDB" tool when the user's question requires fetching data about customers or orders.
      *   When generating SQL: Always enclose table and column names in double quotes (e.g., SELECT "order_id", "customer_name" FROM "orders" JOIN "customers" ON "orders"."customer_id" = "customers"."id"). Use standard SQL syntax (SQLite).
      *   If the tool returns an error or empty data, inform the user clearly.
    `),
  ]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    seed();
  });

  async function sendMessage() {
    setIsLoading(true); // set to true
    const messageHistory = [...messages, new HumanMessage(inputMessage)];

    const response = await message(
      mapChatMessagesToStoredMessages(messageHistory)
    );

    if (response) {
      messageHistory.push(new AIMessage(response as string));
    }

    setMessages(messageHistory);
    setInputMessage("");
    setIsLoading(false); // set to false
  }

  return (
    <div className="flex flex-col h-screen justify-between">
      <header className="bg-white-600 p-2">
        <div className="flex lg:flex-1 items-center justify-center">
          <a href="#" className="m-1.5">
            <span className="sr-only">Text-to-SQL Agent</span>
            
          </a>
          <h1 className="text-white font-bold">Text-to-SQL Agent</h1>
        </div>
      </header>
      <div className="flex flex-col h-full bg-white-400">
        {messages.length > 0 &&
          messages.map((message, index) => {
            if (message instanceof HumanMessage) {
              return (
                <div
                  key={message.getType() + index}
                  className="col-start-1 col-end-8 p-3 rounded-lg"
                >
                  <div className="flex flex-row items-center">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-400 text-white flex-shrink-0 text-sm">
                      Me
                    </div>
                    <div className="relative ml-3 text-sm bg-gray-600 py-2 px-4 shadow rounded-xl">
                      <div>{message.content as string}</div>
                    </div>
                  </div>
                </div>
              );
            }

            if (message instanceof AIMessage) {
              return (
                <div
                  key={message.getType() + index}
                  className="col-start-6 col-end-13 p-3 rounded-lg"
                >
                  <div className="flex items-center justify-start flex-row-reverse">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-400 flex-shrink-0 text-sm">
                      AI
                    </div>
                    <div className="relative mr-3 text-sm bg-purple-950 py-2 px-4 shadow rounded-xl">
                      <div>{message.content as string}</div>
                    </div>
                  </div>
                </div>
              );
            }
          })}
      </div>
      <div className="flex flex-col flex-auto justify-between bg-gray-500 p-6">
        <div className="top-[100vh] flex flex-row items-center h-16 rounded-xl bg-gray-800 w-full px-4">
          <div className="flex-grow ml-4">
            <div className="relative w-full">
              <input
                type="text"
                disabled={isLoading}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex w-full border rounded-xl focus:outline-none focus:border-indigo-300 pl-4 h-10"
              />
            </div>
          </div>
          <div className="ml-4 bg-amber-900">
            <button
              onClick={sendMessage}
              className="flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 rounded-xl text-black px-4 py-2 flex-shrink-0"
            >
              <span>{isLoading ? "Loading..." : "Send"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}