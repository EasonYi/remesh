import React from "react"
import ReactDOM from "react-dom"
import { RemeshRoot } from "./remesh/react"

import { TodoListExtern } from "./todo-app/domains/todoList"
import { Todo } from "./todo-app/domains/todoApp"
import { TodoApp } from "./todo-app"

const initialTodoList: Todo[] = [
  {
    id: -1,
    content: "learn remesh",
    completed: true,
  },
]

ReactDOM.render(
  <React.StrictMode>
    <RemeshRoot
      options={{
        name: "TodoAppStore",
        externs: [TodoListExtern(initialTodoList)],
      }}
    >
      <TodoApp />
    </RemeshRoot>
  </React.StrictMode>,
  document.getElementById("root")
)

window.ReactDOM = ReactDOM
