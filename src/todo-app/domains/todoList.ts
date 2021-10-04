import { map } from 'rxjs/operators'
import { Remesh } from '../../remesh'

import { TodoInputDomain } from './todoInput'
import { TodoFilterDomain } from './todoFilter'
import { merge } from 'rxjs'

export type Todo = {
    id: number
    content: string
    completed: boolean
}

export type AddTodoFailedEventData = {
    message: string
}

export type AddTodoSucceededEventData = {
    newTodo: Todo
}


export type UpdateTodoPayload = {
    todoId: number
    content: string
}

export const TodoListDomain = Remesh.domain({
    name: 'TodoListDomain',
    impl: domain => {
        const todoInputDomain = domain.get(TodoInputDomain)
        const todoFilterDomain = domain.get(TodoFilterDomain)

        const TodoListState = domain.state<Todo[]>({
            name: 'TodoListState',
            default: []
        })

        const AddTodoFailedEvent = domain.event<AddTodoFailedEventData>({
            name: 'AddTodoFailedEvent'
        })

        const AddTodoSuccessEvent = domain.event<AddTodoSucceededEventData>({
            name: 'AddTodoSuccessEvent'
        })

        let todoUid = 0

        const addTodo = domain.command({
            name: 'addTodo',
            impl: ({ get }, todoContent: string) => {
                const todoList = get(TodoListState)

                if (todoContent.length === 0) {
                    return AddTodoFailedEvent({
                        message: `Unexpected empty todo input`
                    })
                }

                const newTodo: Todo = {
                    id: todoUid++,
                    content: todoContent,
                    completed: false
                }

                const newTodoList = todoList.concat(newTodo)

                return [
                    TodoListState(newTodoList),
                    AddTodoSuccessEvent({ newTodo })
                ]
            }
        })

        const removeTodo = domain.command({
            name: 'removeTodo',
            impl: ({ get }, todoId: number) => {
                const todoList = get(TodoListState)
                const newTodoList = todoList.filter(todo => todo.id !== todoId)

                return TodoListState(newTodoList)
            }
        })


        const updateTodo = domain.command({
            name: 'updateTodo',
            impl: ({ get }, payload: UpdateTodoPayload) => {
                const todoList = get(TodoListState)
                const newTodoList = todoList.map(todo => {
                    if (todo.id !== payload.todoId) {
                        return todo
                    }
                    return {
                        ...todo,
                        content: payload.content
                    }
                })

                return TodoListState(newTodoList)
            }
        })

        const toggleTodo = domain.command({
            name: 'toggleTodo',
            impl: ({ get }, todoId: number) => {
                const todoList = get(TodoListState)
                const newTodoList = todoList.map(todo => {
                    if (todo.id !== todoId) {
                        return todo
                    }
                    return {
                        ...todo,
                        completed: !todo.completed
                    }
                })

                return TodoListState(newTodoList)
            }
        })

        const toggleAllTodos = domain.command({
            name: 'toggleAllTodos',
            impl: ({ get }) => {
                const todoList = get(TodoListState)
                const isAllCompleted = get(IsAllCompletedQuery)

                const newTodoList = todoList.map(todo => {
                    return {
                        ...todo,
                        completed: !isAllCompleted
                    }
                })

                return TodoListState(newTodoList)
            }
        })

        const TodoSortedListQuery = domain.query({
            name: 'TodoSortedListQuery',
            impl: ({ get }) => {
                const todoList = get(TodoListState)
                const activeTodoList: Todo[] = []
                const completedTodoList: Todo[] = []

                for (const todo of todoList) {
                    if (todo.completed) {
                        completedTodoList.push(todo)
                    } else {
                        activeTodoList.push(todo)
                    }
                }

                return {
                    activeTodoList,
                    completedTodoList
                }
            }
        })

        const IsAllCompletedQuery = domain.query({
            name: 'IsAllCompletedQuery',
            impl: ({ get }) => {
                const { activeTodoList, completedTodoList } = get(TodoSortedListQuery)

                return activeTodoList.length === 0 && completedTodoList.length > 0
            }
        })


        const TodoFilteredListQuery = domain.query({
            name: 'TodoFilteredListQuery',
            impl: ({ get }) => {
                const todoList = get(TodoListState)
                const todoSortedList = get(TodoSortedListQuery)
                const todoFilter = get(todoFilterDomain.query.TodoFilterQuery)

                if (todoFilter === 'active') {
                    return todoSortedList.activeTodoList
                }

                if (todoFilter === 'completed') {
                    return todoSortedList.completedTodoList
                }

                return todoList
            }
        })

        const TodoMatchedListQuery = domain.query({
            name: 'TodoMatchedListQuery',
            impl: ({ get }) => {
                const todoFilteredList = get(TodoFilteredListQuery)
                const todoInput = get(todoInputDomain.query.TodoInputQuery)

                if (todoInput.length === 0) {
                    return todoFilteredList
                }

                const todoMatchedList = todoFilteredList.filter(todo => {
                    return todo.content.includes(todoInput)
                })

                return todoMatchedList
            }
        })


        const AddTodoEvent = domain.event<string>({
            name: 'AddTodoEvent'
        })

        const InputTodoEvent = domain.event<string>({
            name: 'InputTodoEvent'
        })

        const ToggleAllTodosEvent = domain.event({
            name: 'ToggleAllTodosEvent'
        })

        const ToggleTodoEvent = domain.event<number>({
            name: 'ToggleTodoEvent'
        })

        const UpdateTodoEvent = domain.event<UpdateTodoPayload>({
            name: 'UpdateTodoEvent'
        })

        const RemoveTodoEvent = domain.event<number>({
            name: 'RemoveTodoEvent'
        })

        const TodoListAutorunEffect = domain.effect({
            name: 'TodoListAutorunEffect',
            impl: ({ fromEvent }) => {
                const addTodo$ = fromEvent(AddTodoEvent).pipe(
                    map(todoContent => addTodo(todoContent))
                )

                const changeTodoInput$ = fromEvent(InputTodoEvent).pipe(
                    map(todoInput => todoInputDomain.command.updateTodoInput(todoInput))
                )

                const clearTodoInput$ = fromEvent(AddTodoSuccessEvent).pipe(
                    map(() => todoInputDomain.command.updateTodoInput(''))
                )

                const toggleAllTodos$ = fromEvent(ToggleAllTodosEvent).pipe(
                    map(() => toggleAllTodos())
                )

                const toggleTodo$ = fromEvent(ToggleTodoEvent).pipe(
                    map(todoId => toggleTodo(todoId))
                )

                const updateTodo$ = fromEvent(UpdateTodoEvent).pipe(
                    map(updateTodoPayload => updateTodo(updateTodoPayload))
                )

                const removeTodo$ = fromEvent(RemoveTodoEvent).pipe(
                    map(todoId => removeTodo(todoId))
                )

                return merge(
                    addTodo$,
                    changeTodoInput$,
                    clearTodoInput$,
                    toggleAllTodos$,
                    toggleTodo$,
                    updateTodo$,
                    removeTodo$
                )
            }
        })


        return {
            autorun: [TodoListAutorunEffect],
            event: {
                AddTodoFailedEvent,
                AddTodoSuccessEvent,
                AddTodoEvent,
                InputTodoEvent,
                ToggleAllTodosEvent,
                UpdateTodoEvent,
                RemoveTodoEvent,
                ToggleTodoEvent
            },
            query: {
                IsAllCompletedQuery,
                TodoSortedListQuery,
                TodoMatchedListQuery,
                TodoFilteredListQuery,
            },
            command: {
                addTodo,
                updateTodo,
                removeTodo,
                toggleTodo,
                toggleAllTodos
            }
        }
    }
})