import { http, HttpResponse } from "msw";
import courseList from "../fixtures/course.list.json" assert { type: "json" };
import assignmentList from "../fixtures/assignment.list.json" assert { type: "json" };
import submissionGet from "../fixtures/submission.get.json" assert { type: "json" };
import profileGet from "../fixtures/profile.get.json" assert { type: "json" };
import todoList from "../fixtures/todo.list.json" assert { type: "json" };

const BASE = "https://pucminas.instructure.com/api/v1";

export const handlers = [
  // Profile
  http.get(`${BASE}/users/self`, () => HttpResponse.json(profileGet)),

  // Courses
  http.get(`${BASE}/courses`, () => HttpResponse.json(courseList)),

  // Single course
  http.get(`${BASE}/courses/101`, () => HttpResponse.json(courseList[0])),
  http.get(`${BASE}/courses/9999`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),

  // Assignments
  http.get(`${BASE}/courses/101/assignments`, () =>
    HttpResponse.json(assignmentList)
  ),
  http.get(`${BASE}/courses/101/assignments/201`, () =>
    HttpResponse.json(assignmentList[0])
  ),

  // Submissions list
  http.get(`${BASE}/courses/101/students/submissions`, () =>
    HttpResponse.json([submissionGet])
  ),

  // Single submission
  http.get(
    `${BASE}/courses/101/assignments/201/submissions/self`,
    () => HttpResponse.json(submissionGet)
  ),

  // Submit assignment — success
  http.post(
    `${BASE}/courses/101/assignments/201/submissions`,
    () => HttpResponse.json({ ...submissionGet, workflow_state: "submitted" }, { status: 201 })
  ),

  // Todo
  http.get(`${BASE}/users/self/todo`, () => HttpResponse.json(todoList)),

  // Upcoming events
  http.get(`${BASE}/users/self/upcoming_events`, () =>
    HttpResponse.json(assignmentList)
  ),

  // Missing submissions
  http.get(`${BASE}/users/self/missing_submissions`, () =>
    HttpResponse.json([assignmentList[0]])
  ),

  // Calendar events
  http.get(`${BASE}/calendar_events`, () =>
    HttpResponse.json([
      {
        id: 401,
        title: "Entrega Trabalho 1",
        start_at: "2024-06-15T23:59:00Z",
        end_at: "2024-06-15T23:59:00Z",
        context_code: "course_101",
        type: "assignment",
        html_url: "https://pucminas.instructure.com/courses/101/assignments/201",
        all_day: false,
      },
    ])
  ),

  // Announcements
  http.get(`${BASE}/announcements`, () =>
    HttpResponse.json([
      {
        id: 501,
        title: "Aviso sobre prova P1",
        message: "<p>A prova será realizada no dia 10/07</p>",
        posted_at: "2024-06-01T10:00:00Z",
        context_code: "course_101",
        html_url: "https://pucminas.instructure.com/courses/101/discussion_topics/501",
        author: { display_name: "Prof. Maria Silva" },
      },
    ])
  ),

  // 401 handler for auth test
  http.get(`${BASE}/courses/401`, () =>
    HttpResponse.json({ errors: [{ message: "Invalid access token." }] }, { status: 401 })
  ),

  // 429 handler
  http.get(`${BASE}/courses/429`, () =>
    HttpResponse.json({ errors: [{ message: "Rate limit exceeded" }] }, { status: 429 })
  ),
];
