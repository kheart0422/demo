<%--
Created by IntelliJ IDEA.
User: heart
Date: 26. 10. 3.
Time: 오후 5:18
To change this template use File | Settings | File Templates.
--%>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<html>
    <head>
        <title>Main</title>
    </head>
    <body>
        <div>
            <form action="${pageContext.request.contextPath}/logout" method="post">
                <button type="submit">로그아웃</button>
            </form>
        </div>
        <div>
            여기 헤더
        </div>
        <div>
            여기 리스트
        </div>
        <div>
            여기 푸터
        </div>
    </body>
</html>
