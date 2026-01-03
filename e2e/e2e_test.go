// File: e2e/e2e_test.go
package e2e

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/yuvraj-kolkar17/DevTasks/internal/models"
)

// TestCompleteUserJourney simulates a complete user workflow
func TestCompleteUserJourney(t *testing.T) {
	server, store := SetupTestServer()
	defer server.Close()
	defer store.Clear()

	baseURL := server.URL + "/api/todos"

	t.Run("Step 1: User starts with empty todo list", func(t *testing.T) {
		resp, err := http.Get(baseURL)
		if err != nil {
			t.Fatalf("Failed to get todos: %v", err)
		}
		defer resp.Body.Close()

		var todos []models.Todo
		json.NewDecoder(resp.Body).Decode(&todos)

		if len(todos) != 0 {
			t.Errorf("Expected empty list, got %d todos", len(todos))
		}
	})

	var firstTodoID int

	t.Run("Step 2: User creates first todo 'Buy groceries'", func(t *testing.T) {
		newTodo := models.Todo{
			Title:     "Buy groceries",
			Completed: false,
		}

		body, _ := json.Marshal(newTodo)
		resp, err := http.Post(baseURL, "application/json", bytes.NewBuffer(body))
		if err != nil {
			t.Fatalf("Failed to create todo: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", resp.StatusCode)
		}

		var created models.Todo
		json.NewDecoder(resp.Body).Decode(&created)

		if created.Title != "Buy groceries" {
			t.Errorf("Expected title 'Buy groceries', got '%s'", created.Title)
		}

		if created.Completed {
			t.Error("Expected todo to be not completed")
		}

		firstTodoID = created.ID
	})

	t.Run("Step 3: User creates second todo 'Walk the dog'", func(t *testing.T) {
		newTodo := models.Todo{
			Title:     "Walk the dog",
			Completed: false,
		}

		body, _ := json.Marshal(newTodo)
		resp, err := http.Post(baseURL, "application/json", bytes.NewBuffer(body))
		if err != nil {
			t.Fatalf("Failed to create todo: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			t.Errorf("Expected status 201, got %d", resp.StatusCode)
		}
	})

	t.Run("Step 4: User views all todos (should see 2)", func(t *testing.T) {
		resp, err := http.Get(baseURL)
		if err != nil {
			t.Fatalf("Failed to get todos: %v", err)
		}
		defer resp.Body.Close()

		var todos []models.Todo
		json.NewDecoder(resp.Body).Decode(&todos)

		if len(todos) != 2 {
			t.Errorf("Expected 2 todos, got %d", len(todos))
		}
	})

	t.Run("Step 5: User marks first todo as completed", func(t *testing.T) {
		updatedTodo := models.Todo{
			Title:     "Buy groceries",
			Completed: true,
		}

		body, _ := json.Marshal(updatedTodo)
		url := fmt.Sprintf("%s/%d", baseURL, firstTodoID)

		req, _ := http.NewRequest("PUT", url, bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Failed to update todo: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		var updated models.Todo
		json.NewDecoder(resp.Body).Decode(&updated)

		if !updated.Completed {
			t.Error("Expected todo to be completed")
		}
	})

	t.Run("Step 6: User verifies one todo is completed", func(t *testing.T) {
		resp, err := http.Get(baseURL)
		if err != nil {
			t.Fatalf("Failed to get todos: %v", err)
		}
		defer resp.Body.Close()

		var todos []models.Todo
		json.NewDecoder(resp.Body).Decode(&todos)

		completedCount := 0
		for _, todo := range todos {
			if todo.Completed {
				completedCount++
			}
		}

		if completedCount != 1 {
			t.Errorf("Expected 1 completed todo, got %d", completedCount)
		}
	})

	t.Run("Step 7: User deletes first todo", func(t *testing.T) {
		url := fmt.Sprintf("%s/%d", baseURL, firstTodoID)

		req, _ := http.NewRequest("DELETE", url, nil)
		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Failed to delete todo: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNoContent {
			t.Errorf("Expected status 204, got %d", resp.StatusCode)
		}
	})

	t.Run("Step 8: User verifies only one todo remains", func(t *testing.T) {
		resp, err := http.Get(baseURL)
		if err != nil {
			t.Fatalf("Failed to get todos: %v", err)
		}
		defer resp.Body.Close()

		var todos []models.Todo
		json.NewDecoder(resp.Body).Decode(&todos)

		if len(todos) != 1 {
			t.Errorf("Expected 1 todo, got %d", len(todos))
		}

		if len(todos) > 0 && todos[0].Title != "Walk the dog" {
			t.Errorf("Expected remaining todo to be 'Walk the dog', got '%s'", todos[0].Title)
		}
	})
}

// TestErrorHandling tests error scenarios
func TestErrorHandling(t *testing.T) {
	server, store := SetupTestServer()
	defer server.Close()
	defer store.Clear()

	baseURL := server.URL + "/api/todos"

	t.Run("Creating todo with empty title should fail", func(t *testing.T) {
		newTodo := models.Todo{
			Title:     "",
			Completed: false,
		}

		body, _ := json.Marshal(newTodo)
		resp, err := http.Post(baseURL, "application/json", bytes.NewBuffer(body))
		if err != nil {
			t.Fatalf("Failed request: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("Expected status 400, got %d", resp.StatusCode)
		}
	})

	t.Run("Deleting non-existent todo should fail", func(t *testing.T) {
		url := fmt.Sprintf("%s/99999", baseURL)

		req, _ := http.NewRequest("DELETE", url, nil)
		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Failed request: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNotFound {
			t.Errorf("Expected status 404, got %d", resp.StatusCode)
		}
	})

	t.Run("Updating non-existent todo should fail", func(t *testing.T) {
		updatedTodo := models.Todo{
			Title:     "This doesn't exist",
			Completed: true,
		}

		body, _ := json.Marshal(updatedTodo)
		url := fmt.Sprintf("%s/99999", baseURL)

		req, _ := http.NewRequest("PUT", url, bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("Failed request: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNotFound {
			t.Errorf("Expected status 404, got %d", resp.StatusCode)
		}
	})
}

// TestConcurrentOperations tests concurrent requests
func TestConcurrentOperations(t *testing.T) {
	server, store := SetupTestServer()
	defer server.Close()
	defer store.Clear()

	baseURL := server.URL + "/api/todos"

	t.Run("Multiple users creating todos simultaneously", func(t *testing.T) {
		done := make(chan bool, 10)

		// Create 10 todos concurrently
		for i := 0; i < 10; i++ {
			go func(num int) {
				newTodo := models.Todo{
					Title:     fmt.Sprintf("Todo %d", num),
					Completed: false,
				}

				body, _ := json.Marshal(newTodo)
				http.Post(baseURL, "application/json", bytes.NewBuffer(body))
				done <- true
			}(i)
		}

		// Wait for all goroutines to complete
		for i := 0; i < 10; i++ {
			<-done
		}

		// Verify all todos were created
		resp, _ := http.Get(baseURL)
		defer resp.Body.Close()

		var todos []models.Todo
		json.NewDecoder(resp.Body).Decode(&todos)

		if len(todos) != 10 {
			t.Errorf("Expected 10 todos, got %d", len(todos))
		}
	})
}