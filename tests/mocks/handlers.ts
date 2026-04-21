import { http, HttpResponse } from "msw";
import courseList from "../fixtures/course.list.json" assert { type: "json" };
import assignmentList from "../fixtures/assignment.list.json" assert { type: "json" };
import submissionGet from "../fixtures/submission.get.json" assert { type: "json" };
import profileGet from "../fixtures/profile.get.json" assert { type: "json" };
import todoList from "../fixtures/todo.list.json" assert { type: "json" };
import moduleList from "../fixtures/module.list.json" assert { type: "json" };
import moduleItems from "../fixtures/module.items.json" assert { type: "json" };
import pageList from "../fixtures/page.list.json" assert { type: "json" };
import pageGet from "../fixtures/page.get.json" assert { type: "json" };
import discussionList from "../fixtures/discussion.list.json" assert { type: "json" };
import discussionGet from "../fixtures/discussion.get.json" assert { type: "json" };
import discussionEntries from "../fixtures/discussion.entries.json" assert { type: "json" };
import conversationList from "../fixtures/conversation.list.json" assert { type: "json" };
import conversationGet from "../fixtures/conversation.get.json" assert { type: "json" };
import plannerNoteList from "../fixtures/planner.list.json" assert { type: "json" };
import plannerNoteGet from "../fixtures/planner.get.json" assert { type: "json" };
import enrollmentGrades from "../fixtures/grades.get.json" assert { type: "json" };
import quizList from "../fixtures/quiz.list.json" assert { type: "json" };
import quizGet from "../fixtures/quiz.get.json" assert { type: "json" };
import fileUploadStep1 from "../fixtures/file.upload_step1.json" assert { type: "json" };
import fileConfirm from "../fixtures/file.confirm.json" assert { type: "json" };
import quizQuestions from "../fixtures/quiz.questions.json" assert { type: "json" };
import quizAttemptStart from "../fixtures/quiz.attempt.start.json" assert { type: "json" };
import quizAttemptExisting from "../fixtures/quiz.attempt.existing.json" assert { type: "json" };
import quizSubmissionQuestions from "../fixtures/quiz.submission.questions.json" assert { type: "json" };
import quizSubmissionAnswer from "../fixtures/quiz.submission.answer.json" assert { type: "json" };
import quizSubmissionComplete from "../fixtures/quiz.submission.complete.json" assert { type: "json" };
import quizSubmissionsList from "../fixtures/quiz.submissions.list.json" assert { type: "json" };
import quizSubmissionGet from "../fixtures/quiz.submission.get.json" assert { type: "json" };
import quizTimeLeft from "../fixtures/quiz.time_left.json" assert { type: "json" };

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

  // ── Modules ────────────────────────────────────────────────────────────────

  http.get(`${BASE}/courses/101/modules`, () => HttpResponse.json(moduleList)),
  http.get(`${BASE}/courses/401/modules`, () =>
    HttpResponse.json({ errors: [{ message: "Invalid access token." }] }, { status: 401 })
  ),
  http.get(`${BASE}/courses/9999/modules`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),
  http.get(`${BASE}/courses/101/modules/301/items`, () =>
    HttpResponse.json(moduleItems)
  ),
  http.put(`${BASE}/courses/101/modules/301/items/1001/done`, () =>
    new HttpResponse(null, { status: 204 })
  ),
  http.put(`${BASE}/courses/101/modules/301/items/9999/done`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),

  // ── Pages ──────────────────────────────────────────────────────────────────

  http.get(`${BASE}/courses/101/pages`, () => HttpResponse.json(pageList)),
  http.get(`${BASE}/courses/101/pages/introducao-ao-curso`, () =>
    HttpResponse.json(pageGet)
  ),
  http.get(`${BASE}/courses/101/pages/9999`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),
  http.get(`${BASE}/courses/9999/pages`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),

  // ── Discussions ────────────────────────────────────────────────────────────

  http.get(`${BASE}/courses/101/discussion_topics`, () =>
    HttpResponse.json(discussionList)
  ),
  http.get(`${BASE}/courses/101/discussion_topics/601`, () =>
    HttpResponse.json(discussionGet)
  ),
  http.get(`${BASE}/courses/101/discussion_topics/601/entries`, () =>
    HttpResponse.json(discussionEntries)
  ),
  http.post(`${BASE}/courses/101/discussion_topics/601/entries`, () =>
    HttpResponse.json(
      { id: 9001, user_id: 999, message: "<p>Meu comentário</p>", read_state: "read", created_at: "2024-06-01T10:00:00Z", updated_at: "2024-06-01T10:00:00Z" },
      { status: 201 }
    )
  ),
  http.post(`${BASE}/courses/101/discussion_topics/601/entries/701/replies`, () =>
    HttpResponse.json(
      { id: 9002, user_id: 999, message: "<p>Minha resposta</p>", read_state: "read", created_at: "2024-06-01T11:00:00Z", updated_at: "2024-06-01T11:00:00Z" },
      { status: 201 }
    )
  ),
  http.get(`${BASE}/courses/9999/discussion_topics`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),

  // ── Conversations ──────────────────────────────────────────────────────────

  http.get(`${BASE}/conversations`, () =>
    HttpResponse.json(conversationList)
  ),
  http.get(`${BASE}/conversations/801`, () =>
    HttpResponse.json(conversationGet)
  ),
  http.get(`${BASE}/conversations/9999`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),
  http.post(`${BASE}/conversations`, () =>
    HttpResponse.json([conversationGet], { status: 201 })
  ),
  http.post(`${BASE}/conversations/801/add_message`, () =>
    HttpResponse.json(conversationGet, { status: 200 })
  ),

  // ── Planner Notes ──────────────────────────────────────────────────────────

  http.get(`${BASE}/planner_notes`, () =>
    HttpResponse.json(plannerNoteList)
  ),
  http.get(`${BASE}/planner_notes/901`, () =>
    HttpResponse.json(plannerNoteGet)
  ),
  http.get(`${BASE}/planner_notes/9999`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),
  http.post(`${BASE}/planner_notes`, () =>
    HttpResponse.json({ ...plannerNoteGet, id: 902 }, { status: 201 })
  ),
  http.put(`${BASE}/planner_notes/901`, () =>
    HttpResponse.json({ ...plannerNoteGet, title: "Nota atualizada" })
  ),
  http.delete(`${BASE}/planner_notes/901`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  // ── Grades ─────────────────────────────────────────────────────────────────

  http.get(`${BASE}/courses/101/enrollments`, () =>
    HttpResponse.json(enrollmentGrades)
  ),
  http.get(`${BASE}/courses/9999/enrollments`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),

  // ── Quizzes ────────────────────────────────────────────────────────────────

  http.get(`${BASE}/courses/101/quizzes`, () => HttpResponse.json(quizList)),
  http.get(`${BASE}/courses/101/quizzes/1001`, () => HttpResponse.json(quizGet)),
  http.get(`${BASE}/courses/101/quizzes/9999`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),
  http.get(`${BASE}/courses/9999/quizzes`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),

  // ── Files ──────────────────────────────────────────────────────────────────

  http.get(`${BASE}/courses/101/files`, () =>
    HttpResponse.json([
      fileConfirm,
      {
        id: 5002,
        display_name: "notas.txt",
        filename: "notas.txt",
        url: "https://pucminas.instructure.com/files/5002/download",
        "content-type": "text/plain",
        size: 36,
        folder_id: 100,
        created_at: "2024-06-02T12:00:00Z",
      },
    ])
  ),

  http.post(`${BASE}/users/self/files`, () =>
    HttpResponse.json(fileUploadStep1, { status: 200 })
  ),

  http.post("https://instructure-uploads.s3.amazonaws.com/", () =>
    new HttpResponse(null, { status: 303, headers: { location: "https://pucminas.instructure.com/api/v1/files/5001/confirm" } })
  ),

  http.get(`${BASE}/files/5001/confirm`, () =>
    HttpResponse.json(fileConfirm)
  ),

  http.get(`${BASE}/files/5001`, () =>
    HttpResponse.json(fileConfirm)
  ),

  http.get(`${BASE}/files/5002`, () =>
    HttpResponse.json({
      id: 5002,
      display_name: "notas.txt",
      filename: "notas.txt",
      url: "https://pucminas.instructure.com/files/5002/download",
      "content-type": "text/plain",
      size: 36,
      folder_id: 100,
      created_at: "2024-06-02T12:00:00Z",
    })
  ),

  http.get("https://pucminas.instructure.com/files/5002/download", () =>
    new HttpResponse("Conteudo de teste do arquivo.", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": "attachment; filename=notas.txt",
      },
    })
  ),

  // ── Quiz-taking flow (Phase 3) ─────────────────────────────────────────────

  // List questions (flat array)
  http.get(`${BASE}/courses/101/quizzes/1001/questions`, () =>
    HttpResponse.json(quizQuestions)
  ),
  http.get(`${BASE}/courses/101/quizzes/9999/questions`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),

  // Start attempt — quiz 1001: success
  http.post(`${BASE}/courses/101/quizzes/1001/submissions`, () =>
    HttpResponse.json(quizAttemptStart, { status: 201 })
  ),

  // Start attempt — quiz 1002: 409 conflict, then recovery via GET singular
  http.post(`${BASE}/courses/101/quizzes/1002/submissions`, () =>
    HttpResponse.json(
      { errors: [{ message: "já existe uma tentativa em andamento" }] },
      { status: 409 }
    )
  ),
  http.get(`${BASE}/courses/101/quizzes/1002/submission`, () =>
    HttpResponse.json(quizAttemptExisting)
  ),

  // Submission questions (submission-scoped, NOT course-scoped)
  http.get(`${BASE}/quiz_submissions/2001/questions`, () =>
    HttpResponse.json(quizSubmissionQuestions)
  ),
  http.get(`${BASE}/quiz_submissions/9999/questions`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),

  // Answer question
  http.post(`${BASE}/quiz_submissions/2001/questions`, () =>
    HttpResponse.json(quizSubmissionAnswer)
  ),

  // Complete attempt
  http.post(`${BASE}/courses/101/quizzes/1001/submissions/2001/complete`, () =>
    HttpResponse.json(quizSubmissionComplete)
  ),

  // List submissions
  http.get(`${BASE}/courses/101/quizzes/1001/submissions`, () =>
    HttpResponse.json(quizSubmissionsList)
  ),

  // Get single submission
  http.get(`${BASE}/courses/101/quizzes/1001/submissions/2001`, () =>
    HttpResponse.json(quizSubmissionGet)
  ),
  http.get(`${BASE}/courses/101/quizzes/1001/submissions/9999`, () =>
    HttpResponse.json({ errors: [{ message: "não encontrado" }] }, { status: 404 })
  ),

  // Time left
  http.get(`${BASE}/courses/101/quizzes/1001/submissions/2001/time`, () =>
    HttpResponse.json(quizTimeLeft)
  ),
];
