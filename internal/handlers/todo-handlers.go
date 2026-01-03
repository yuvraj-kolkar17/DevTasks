
package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "strings"

    "github.com/yuvraj-kolkar17/DevTasks/internal/models"
    "github.com/yuvraj-kolkar17/DevTasks/internal/store"
)

type TodoHandler struct {
    store *store.MemoryStore
}

func NewTodoHandler(store *store.MemoryStore) *TodoHandler {
    return &TodoHandler{store: store}
}

func (h *TodoHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    
    // Handle CORS for E2E testing
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
    
    if r.Method == "OPTIONS" {
        return
    }
    
    path := strings.TrimPrefix(r.URL.Path, "/api/todos")
    
    switch {
    case path == "" || path == "/":
        if r.Method == "GET" {
            h.GetAll(w, r)
        } else if r.Method == "POST" {
            h.Create(w, r)
        } else {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        }
    default:
        // Extract ID from path
        idStr := strings.TrimPrefix(path, "/")
        id, err := strconv.Atoi(idStr)
        if err != nil {
            http.Error(w, "Invalid ID", http.StatusBadRequest)
            return
        }
        
        switch r.Method {
        case "GET":
            h.GetByID(w, r, id)
        case "PUT":
            h.Update(w, r, id)
        case "DELETE":
            h.Delete(w, r, id)
        default:
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        }
    }
}

func (h *TodoHandler) GetAll(w http.ResponseWriter, r *http.Request) {
    todos := h.store.GetAll()
    json.NewEncoder(w).Encode(todos)
}

func (h *TodoHandler) GetByID(w http.ResponseWriter, r *http.Request, id int) {
    todo, err := h.store.GetByID(id)
    if err != nil {
        http.Error(w, "Todo not found", http.StatusNotFound)
        return
    }
    json.NewEncoder(w).Encode(todo)
}

func (h *TodoHandler) Create(w http.ResponseWriter, r *http.Request) {
    var todo models.Todo
    if err := json.NewDecoder(r.Body).Decode(&todo); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }
    
    if todo.Title == "" {
        http.Error(w, "Title is required", http.StatusBadRequest)
        return
    }
    
    created := h.store.Create(todo)
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(created)
}

func (h *TodoHandler) Update(w http.ResponseWriter, r *http.Request, id int) {
    var todo models.Todo
    if err := json.NewDecoder(r.Body).Decode(&todo); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }
    
    if err := h.store.Update(id, todo); err != nil {
        http.Error(w, "Todo not found", http.StatusNotFound)
        return
    }
    
    todo.ID = id
    json.NewEncoder(w).Encode(todo)
}

func (h *TodoHandler) Delete(w http.ResponseWriter, r *http.Request, id int) {
    if err := h.store.Delete(id); err != nil {
        http.Error(w, "Todo not found", http.StatusNotFound)
        return
    }
    w.WriteHeader(http.StatusNoContent)
}