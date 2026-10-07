<%--
  Created by IntelliJ IDEA.
  User: heart
  Date: 26. 10. 6.
  Time: 오후 6:01
  To change this template use File | Settings | File Templates.
--%>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
    <head>
        <title>Signup</title>
    </head>
    <body>
        <div>회원가입</div>
        <div id="wrap" class="wrapper">
            <form method ="post" name="signupForm" id="signupForm">

                <div class="userInput">
                    <!-- 아이디 입력 -->
                    <h3 class="list">아이디<span id="idError"></span></h3>
                    <span class="box int_id" >
                        <input type="text" id="username" class="int check" maxlength="20">
                    </span>
                </div>
                <div class="userInput">
                    <!-- 비밀번호 입력 -->
                    <h3 class="list">비밀번호<span id="pwError"></span></h3>
                    <span class="box int_id">
                        <input type="password" id="password" class="int check" maxlength="20">
                    </span>
                </div>
                <!-- 비밀번호 재확인 입력 -->
                <div class="userInput">
                    <h3 class="list">
                        비밀번호 재확인<span id="pwCheckError"></span>
                    </h3>
                    <span class="box int_id">
                        <input type="password" id="passwordConfirm" class="int check" maxlength="20">
                    </span>
                </div>
                <div>
                    <input type="submit" value="회원가입" href="${pageContext.request.contextPath}/signupApi"/>
                </div>
            </form>

            <script>
                document.getElementById("signupForm").addEventListener("submit", async function(e) {

                    // form 기본 제출 막기
                    e.preventDefault();

                    const username = document.getElementById("username").value.trim();
                        const password = document.getElementById("password").value.trim();
                        const passwordConfirm = document.getElementById("passwordConfirm").value.trim();

                        // 빈 값(또는 공백만 입력된 경우) 체크
                        if (!username || !password || !passwordConfirm) {
                            alert(" 모든 항목을 입력해 주세요.");
                            return;
                        }

                        // 비밀번호와 비밀번호 확인 일치 여부 사전 체크 (선택 사항)
                        if (password !== passwordConfirm) {
                            alert("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
                            return;
                        }

                        const data = { username, password, passwordConfirm };

                    try {
                        const response = await fetch("/signupApi", {
                            method: "POST",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify(data)
                        });

                        const message = await response.text();

                        if (response.ok) {
                            console.error(message);
                            alert(message);
                            location.href = "/login";
                        } else {
                            alert(message);
                        }

                    } catch (error) {
                        alert("회원가입 처리 중 오류가 발생했습니다.");
                        console.error(error);
                    }
                });
            </script>

        </div>
    </body>
</html>
