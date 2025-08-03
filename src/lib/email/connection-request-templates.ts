interface ConnectionRequestEmailData {
  expertName: string
  organizationName: string
  subject: string
  message: string
  projectType: string
  expectedBudget?: string
  expectedDuration?: string
  urgency: 'low' | 'medium' | 'high'
  requestId: string
  approveUrl: string
  rejectUrl: string
}

export function generateConnectionRequestEmail(data: ConnectionRequestEmailData): {
  subject: string
  html: string
  text: string
} {
  const urgencyText = {
    low: '여유있음',
    medium: '보통',
    high: '긴급'
  }

  const urgencyColor = {
    low: '#10B981',
    medium: '#F59E0B', 
    high: '#EF4444'
  }

  const subject = `새로운 협업 요청: ${data.subject}`

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>새로운 협업 요청</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8fafc;
    }
    .container {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .request-info {
      background-color: #F8FAFC;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #E2E8F0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #4A5568;
    }
    .info-value {
      color: #2D3748;
    }
    .urgency {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }
    .message-box {
      background-color: #F7FAFC;
      border-left: 4px solid #3B82F6;
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .action-buttons {
      text-align: center;
      margin: 40px 0;
    }
    .btn {
      display: inline-block;
      padding: 16px 32px;
      margin: 0 10px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.3s ease;
    }
    .btn-approve {
      background-color: #10B981;
      color: white;
    }
    .btn-approve:hover {
      background-color: #059669;
    }
    .btn-reject {
      background-color: #EF4444;
      color: white;
    }
    .btn-reject:hover {
      background-color: #DC2626;
    }
    .footer {
      text-align: center;
      padding: 20px;
      background-color: #F8FAFC;
      color: #6B7280;
      font-size: 14px;
    }
    .footer a {
      color: #3B82F6;
      text-decoration: none;
    }
    @media (max-width: 600px) {
      .btn {
        display: block;
        margin: 10px 0;
      }
      .info-row {
        flex-direction: column;
        gap: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>새로운 협업 요청이 도착했습니다!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Expert Matching Platform</p>
    </div>
    
    <div class="content">
      <p>안녕하세요, <strong>${data.expertName}</strong>님!</p>
      <p><strong>${data.organizationName}</strong>에서 협업 요청을 보내왔습니다.</p>
      
      <div class="request-info">
        <h3 style="margin-top: 0; color: #2D3748;">요청 정보</h3>
        <div class="info-row">
          <span class="info-label">제목:</span>
          <span class="info-value">${data.subject}</span>
        </div>
        <div class="info-row">
          <span class="info-label">프로젝트 유형:</span>
          <span class="info-value">${data.projectType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">긴급도:</span>
          <span class="urgency" style="background-color: ${urgencyColor[data.urgency]}">${urgencyText[data.urgency]}</span>
        </div>
        ${data.expectedBudget ? `
        <div class="info-row">
          <span class="info-label">예상 예산:</span>
          <span class="info-value">${data.expectedBudget}</span>
        </div>
        ` : ''}
        ${data.expectedDuration ? `
        <div class="info-row">
          <span class="info-label">예상 기간:</span>
          <span class="info-value">${data.expectedDuration}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="message-box">
        <h4 style="margin-top: 0; color: #2D3748;">상세 메시지</h4>
        <p style="margin-bottom: 0; white-space: pre-line;">${data.message}</p>
      </div>
      
      <div class="action-buttons">
        <a href="${data.approveUrl}" class="btn btn-approve">수락하기</a>
        <a href="${data.rejectUrl}" class="btn btn-reject">거절하기</a>
      </div>
      
      <p style="text-align: center; color: #6B7280; font-size: 14px;">
        이 요청은 7일 후 자동으로 만료됩니다.
      </p>
    </div>
    
    <div class="footer">
      <p>이 이메일은 Expert Matching Platform에서 자동으로 발송되었습니다.</p>
      <p>문의사항이 있으시면 <a href="mailto:support@expertmatching.com">support@expertmatching.com</a>으로 연락해주세요.</p>
    </div>
  </div>
</body>
</html>
  `

  const text = `
새로운 협업 요청이 도착했습니다!

안녕하세요, ${data.expertName}님!

${data.organizationName}에서 협업 요청을 보내왔습니다.

=== 요청 정보 ===
제목: ${data.subject}
프로젝트 유형: ${data.projectType}
긴급도: ${urgencyText[data.urgency]}
${data.expectedBudget ? `예상 예산: ${data.expectedBudget}` : ''}
${data.expectedDuration ? `예상 기간: ${data.expectedDuration}` : ''}

=== 상세 메시지 ===
${data.message}

=== 응답하기 ===
수락하기: ${data.approveUrl}
거절하기: ${data.rejectUrl}

이 요청은 7일 후 자동으로 만료됩니다.

---
이 이메일은 Expert Matching Platform에서 자동으로 발송되었습니다.
문의사항: support@expertmatching.com
  `

  return {
    subject,
    html,
    text
  }
}

export function generateApprovalConfirmationEmail(data: {
  organizationName: string
  expertName: string
  expertEmail: string
  expertPhone?: string
  subject: string
}): {
  subject: string
  html: string
  text: string
} {
  const subject = `연결 요청이 승인되었습니다: ${data.subject}`

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>연결 요청 승인</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8fafc;
    }
    .container {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .content {
      padding: 40px 30px;
    }
    .contact-info {
      background-color: #F0FDF4;
      border: 2px solid #10B981;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .contact-item {
      display: flex;
      align-items: center;
      padding: 8px 0;
    }
    .contact-label {
      font-weight: 600;
      color: #065F46;
      min-width: 80px;
    }
    .contact-value {
      color: #059669;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 연결 요청이 승인되었습니다!</h1>
    </div>
    
    <div class="content">
      <p>안녕하세요, <strong>${data.organizationName}</strong>님!</p>
      <p><strong>${data.expertName}</strong> 전문가가 협업 요청을 수락했습니다.</p>
      
      <div class="contact-info">
        <h3 style="margin-top: 0; color: #065F46;">전문가 연락처</h3>
        <div class="contact-item">
          <span class="contact-label">이름:</span>
          <span class="contact-value">${data.expertName}</span>
        </div>
        <div class="contact-item">
          <span class="contact-label">이메일:</span>
          <span class="contact-value">${data.expertEmail}</span>
        </div>
        ${data.expertPhone ? `
        <div class="contact-item">
          <span class="contact-label">전화:</span>
          <span class="contact-value">${data.expertPhone}</span>
        </div>
        ` : ''}
      </div>
      
      <p>이제 전문가와 직접 연락하여 협업을 진행하실 수 있습니다.</p>
      <p>성공적인 프로젝트가 되시길 바랍니다!</p>
    </div>
  </div>
</body>
</html>
  `

  const text = `
연결 요청이 승인되었습니다!

안녕하세요, ${data.organizationName}님!

${data.expertName} 전문가가 협업 요청을 수락했습니다.

=== 전문가 연락처 ===
이름: ${data.expertName}
이메일: ${data.expertEmail}
${data.expertPhone ? `전화: ${data.expertPhone}` : ''}

이제 전문가와 직접 연락하여 협업을 진행하실 수 있습니다.
성공적인 프로젝트가 되시길 바랍니다!
  `

  return {
    subject,
    html,
    text
  }
}