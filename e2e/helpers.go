package e2e

import (
    "net/http"
    "net/http/httptest"
    
    "github.com/yuvraj-kolkar17/DevTasks/internal/handlers"
    "github.com/yuvraj-kolkar17/DevTasks/internal/store"
)

// SetupTestServer creates a test server for E2E testing
func SetupTestServer() (*httptest.Server, *store.MemoryStore) {
    todoStore := store.NewMemoryStore()
    todoHandler := handlers.NewTodoHandler(todoStore)
    
    mux := http.NewServeMux()
    mux.Handle("/api/todos", todoHandler)
    mux.Handle("/api/todos/", todoHandler)
    
    server := httptest.NewServer(mux)
    
    return server, todoStore
}