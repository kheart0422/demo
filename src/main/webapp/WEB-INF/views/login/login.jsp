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

        <!-- 자바스크립트 영역 -->
        <script type="text/javascript">

            // 미가입 안내는 로그인 실패 후 명시적으로 전달된 경우에만 표시합니다.
            <% if ("true".equals(request.getParameter("unregistered"))) { %>
                window.addEventListener("DOMContentLoaded", function () {
                    alert("회원이 아닙니다. 회원가입 페이지로 이동합니다.");
                    location.replace("${pageContext.request.contextPath}/signup");
                });
            <% } %>
        </script>

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
                    로그인
                </button>
            </form>

            <div class="signup">
                계정이 없으신가요?
                <a href="${pageContext.request.contextPath}/signup">
                    회원가입
                </a>
            </div>
        </div>

    </body>
</html>
