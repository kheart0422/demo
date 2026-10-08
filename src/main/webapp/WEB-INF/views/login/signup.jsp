<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>회원가입 | 파일 보관함</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/vendor/bootstrap/css/bootstrap.min.css">
</head>
<body class="bg-body-tertiary">
<main class="container min-vh-100 d-flex align-items-center justify-content-center py-5">
    <div class="card border-0 shadow-sm rounded-4 w-100" style="max-width: 480px;">
        <div class="card-body p-4 p-md-5">
            <div class="mb-4">
                <span class="badge text-bg-primary rounded-pill mb-3">파일 보관함</span>
                <h1 class="h3 fw-bold mb-2">새 계정 만들기</h1>
                <p class="text-body-secondary mb-0">가입 정보를 입력해 계정을 생성하세요.</p>
            </div>

            <form method="post" name="signupForm" id="signupForm" novalidate>
                <div class="mb-3">
                    <label for="username" class="form-label">아이디</label>
                    <input type="text" id="username" class="form-control form-control-lg" maxlength="20"
                           autocomplete="username" placeholder="사용할 아이디를 입력하세요" required>
                    <div class="invalid-feedback">아이디를 입력해 주세요.</div>
                </div>

                <div class="mb-3">
                    <label for="password" class="form-label">비밀번호</label>
                    <input type="password" id="password" class="form-control form-control-lg" maxlength="20"
                           autocomplete="new-password" placeholder="비밀번호를 입력하세요" required>
                    <div class="invalid-feedback">비밀번호를 입력해 주세요.</div>
                </div>

                <div class="mb-4">
                    <label for="passwordConfirm" class="form-label">비밀번호 확인</label>
                    <input type="password" id="passwordConfirm" class="form-control form-control-lg" maxlength="20"
                           autocomplete="new-password" placeholder="비밀번호를 한 번 더 입력하세요" required>
                    <div class="invalid-feedback">비밀번호를 다시 입력해 주세요.</div>
                </div>

                <div id="signupMessage" class="alert d-none" role="alert"></div>
                <button type="submit" class="btn btn-primary btn-lg w-100" id="signupButton">회원가입</button>
            </form>

            <p class="text-center text-body-secondary mt-4 mb-0">
                이미 계정이 있으신가요?
                <a class="link-primary fw-semibold text-decoration-none" href="${pageContext.request.contextPath}/login">로그인</a>
            </p>
        </div>
    </div>
</main>

<script>
    const contextPath = "${pageContext.request.contextPath}";
    const signupForm = document.getElementById("signupForm");
    const signupMessage = document.getElementById("signupMessage");
    const signupButton = document.getElementById("signupButton");

    signupForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        signupForm.classList.add("was-validated");

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const passwordConfirm = document.getElementById("passwordConfirm").value;

        const usernameInput = document.getElementById("username");
        const confirmInput = document.getElementById("passwordConfirm");
        usernameInput.setCustomValidity(username ? "" : "아이디를 입력해 주세요.");
        confirmInput.setCustomValidity("");
        confirmInput.classList.remove("is-invalid");

        if (!signupForm.checkValidity()) {
            signupForm.reportValidity();
            return;
        }

        if (password !== passwordConfirm) {
            confirmInput.setCustomValidity("비밀번호가 일치하지 않습니다.");
            confirmInput.classList.add("is-invalid");
            confirmInput.reportValidity();
            return;
        }
        document.getElementById("passwordConfirm").setCustomValidity("");
        document.getElementById("passwordConfirm").classList.remove("is-invalid");

        signupButton.disabled = true;
        signupButton.textContent = "가입 처리 중...";
        signupMessage.className = "alert d-none";

        try {
            const response = await fetch(contextPath + "/signupApi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, passwordConfirm })
            });
            const message = await response.text();

            signupMessage.textContent = message;
            signupMessage.className = "alert " + (response.ok ? "alert-success" : "alert-danger");

            if (response.ok) {
                setTimeout(function () {
                    location.href = contextPath + "/login";
                }, 900);
            }
        } catch (error) {
            signupMessage.textContent = "회원가입 처리 중 오류가 발생했습니다.";
            signupMessage.className = "alert alert-danger";
        } finally {
            signupButton.disabled = false;
            signupButton.textContent = "회원가입";
        }
    });
</script>
<script src="${pageContext.request.contextPath}/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
</body>
</html>
