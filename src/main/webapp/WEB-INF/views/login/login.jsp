<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>로그인</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/vendor/bootstrap/css/bootstrap.min.css">
</head>
<body class="bg-body-tertiary">
<main class="container min-vh-100 d-flex align-items-center justify-content-center py-5">
    <div class="card border-0 shadow-sm rounded-4 w-100" style="max-width: 440px;">
        <div class="card-body p-4 p-md-5">
            <div class="mb-4">
                <p class="text-body-secondary mb-0">계정 정보를 입력해 로그인하세요.</p>
            </div>

            <% if (request.getParameter("error") != null) { %>
                <div class="alert alert-danger" role="alert">
                    아이디 또는 비밀번호를 확인해 주세요.
                </div>
            <% } %>

            <form action="${pageContext.request.contextPath}/login" method="post" id="loginForm">
                <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}">

                <div class="mb-3">
                    <label for="username" class="form-label">아이디</label>
                    <input type="text" class="form-control form-control-lg" id="username" name="username"
                           placeholder="아이디를 입력하세요" autocomplete="username" required autofocus>
                </div>

                <div class="mb-4">
                    <label for="password" class="form-label">비밀번호</label>
                    <input type="password" class="form-control form-control-lg" id="password" name="password"
                           placeholder="비밀번호를 입력하세요" autocomplete="current-password" required>
                </div>

                <button type="submit" class="btn btn-primary btn-lg w-100">로그인</button>
            </form>

            <p class="text-center text-body-secondary mt-4 mb-0">
                계정이 없으신가요?
                <a class="link-primary fw-semibold text-decoration-none" href="${pageContext.request.contextPath}/signup">회원가입</a>
            </p>
        </div>
    </div>
</main>

<script>
    <% if ("true".equals(request.getParameter("unregistered"))) { %>
    window.addEventListener("DOMContentLoaded", function () {
        alert("회원이 아닙니다. 회원가입 페이지로 이동합니다.");
        location.replace("${pageContext.request.contextPath}/signup");
    });
    <% } %>
</script>
<script src="${pageContext.request.contextPath}/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
</body>
</html>
