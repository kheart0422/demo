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
        <!-- 자바스크립트(유효성검사 해당) -->
        <script src ="signUpjs3.js"></script>
    </head>
    <body>
        <div>회원가입</div>
        <div id="wrap" class="wrapper">
            <form method ="post" name="join" id="join">

                <div class="userInput">
                    <!-- 아이디 입력 -->
                    <h3 class="list">아이디<span id="idError"></span></h3>
                    <span class="box int_id" >
                        <input type="text" id="id" class="int check"maxlength="20">
                    </span>
                </div>
                <div class="userInput">
                    <!-- 비밀번호 입력 -->
                    <h3 class="list">비밀번호<span id="pwError"></span></h3>
                    <span class="box int_id">
                        <input type="password" id="pw" class="int check"maxlength="20">
                    </span>
                </div>
                <!-- 비밀번호 재확인 입력 -->
                <div class="userInput">
                    <h3 class="list">
                        비밀번호 재확인<span id="pwCheckError"></span>
                    </h3>
                    <span class="box int_id">
                        <input type="password" id="pwCheck" class="int check" maxlength="20">
                    </span>
                </div>
                <div>
                    <input type="submit" value="회원가입" />
                </div>
            </form>
        </div>
    </body>
</html>
