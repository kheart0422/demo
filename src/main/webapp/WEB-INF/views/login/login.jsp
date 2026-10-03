<%--
  Created by IntelliJ IDEA.
  User: heart
  Date: 26. 10. 2.
  Time: 오후 6:12
  To change this template use File | Settings | File Templates.
--%>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
    <head>
        <title>Title</title>
    </head>
    <body>
        <h1>login</h1>

        <div class="login-container">
            <h1>Welcome back</h1>
            <p class="description">계정에 로그인하세요.</p>

            <% if (request.getParameter("error") != null) { %>
                <div class="error">
                    아이디 또는 비밀번호를 확인해주세요.
                </div>
            <% } %>

            <form action="${pageContext.request.contextPath}/login"
                  method="post" id="loginForm">

                <input type="hidden"
                       name="${_csrf.parameterName}"
                       value="${_csrf.token}">

                <div class="form-group">
                    <label for="username">아이디</label>
                    <input type="text"
                           id="username"
                           name="username"
                           placeholder="아이디를 입력하세요"
                           required>
                </div>

                <div class="form-group">
                    <label for="password">비밀번호</label>
                    <input type="password"
                           id="password"
                           name="password"
                           placeholder="비밀번호를 입력하세요"
                           required>
                </div>

                <button type="submit" class="login-button">
                    로그인2
                </button>
            </form>

            <script>
                // 폼 제출을 막은 뒤 /main으로 이동하고 있어서, POST /login 요청이 LoginFilter에 도달하지 않음
                /* document.getElementById('loginForm').addEventListener('submit', function(event) {
                    event.preventDefault(); // 기본 폼 제출(페이지 새로고침) 막기

                    // 비동기 로그인 처리(fetch/axios) 후 원하는 URL로 이동
                    window.location.href = '/main'; // 이동할 URL 입력
                }); */
            </script>

            <div class="signup">
                계정이 없으신가요?
                <a href="${pageContext.request.contextPath}/signup">
                    회원가입
                </a>
            </div>
        </div>

    </body>
</html>
