
package store

import (
    "errors"
    "sync"
    "github.com/yuvraj-kolkar17/DevTasks/internal/models"
)

var (
    ErrNotFound = errors.New("todo not found")
)

type MemoryStore struct {
    todos  map[int]models.Todo
    nextID int
    mu     sync.RWMutex
}

func NewMemoryStore() *MemoryStore {
    return &MemoryStore{
        todos:  make(map[int]models.Todo),
        nextID: 1,
    }
}

func (s *MemoryStore) GetAll() []models.Todo {
    s.mu.RLock()
    defer s.mu.RUnlock()
    
    result := make([]models.Todo, 0, len(s.todos))
    for _, todo := range s.todos {
        result = append(result, todo)
    }
    return result
}

func (s *MemoryStore) GetByID(id int) (models.Todo, error) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    
    todo, exists := s.todos[id]
    if !exists {
        return models.Todo{}, ErrNotFound
    }
    return todo, nil
}

func (s *MemoryStore) Create(todo models.Todo) models.Todo {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    todo.ID = s.nextID
    s.nextID++
    s.todos[todo.ID] = todo
    return todo
}

func (s *MemoryStore) Update(id int, todo models.Todo) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    if _, exists := s.todos[id]; !exists {
        return ErrNotFound
    }
    
    todo.ID = id
    s.todos[id] = todo
    return nil
}

func (s *MemoryStore) Delete(id int) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    if _, exists := s.todos[id]; !exists {
        return ErrNotFound
    }
    
    delete(s.todos, id)
    return nil
}

func (s *MemoryStore) Clear() {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    s.todos = make(map[int]models.Todo)
    s.nextID = 1
}
