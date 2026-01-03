package main

import (
    "log"
    "net/http"

    "github.com/yuvraj-kolkar17/DevTasks/internal/handlers"
    "github.com/yuvraj-kolkar17/DevTasks/internal/store"
)

func main() {
    // Initialize store
    todoStore := store.NewMemoryStore()
    
    // Initialize handlers
    todoHandler := handlers.NewTodoHandler(todoStore)
    
    // Setup routes
    mux := http.NewServeMux()
    
    // API routes (these should come first to have priority)
    mux.Handle("/api/todos", todoHandler)
    mux.Handle("/api/todos/", todoHandler)
    
    // Serve static files from ./web directory
    fs := http.FileServer(http.Dir("./static"))
    mux.Handle("/", fs)
    
    // Start server
    log.Println("🚀 Server starting on http://localhost:8080")
    log.Fatal(http.ListenAndServe(":8080", mux))
}
