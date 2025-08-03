export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export class EmailTemplate {
  static campaignMatch({
    expertName,
    campaignTitle,
    campaignUrl,
  }: {
    expertName: string
    campaignTitle: string
    campaignUrl: string
  }) {
    const subject = `🔔 새로운 매칭 요청: ${campaignTitle}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3B82F6; color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #F9FAFB; padding: 30px; border: 1px solid #E5E7EB; }
            .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6B7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>새로운 캠페인 매칭 알림</h1>
            </div>
            <div class="content">
              <p>안녕하세요 ${expertName}님,</p>
              <p>귀하의 전문 분야와 일치하는 새로운 캠페인이 등록되었습니다.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #1F2937; margin-top: 0;">${campaignTitle}</h2>
                <p style="color: #6B7280;">귀하의 프로필이 이 캠페인의 요구사항과 매칭되었습니다.</p>
              </div>
              
              <p>제안서를 제출하고 자세한 내용을 확인하시려면 아래 버튼을 클릭해주세요:</p>
              
              <div style="text-align: center;">
                <a href="${campaignUrl}" class="button">캠페인 상세보기</a>
              </div>
              
              <p style="color: #6B7280; font-size: 14px;">
                * 이 캠페인은 선착순으로 마감될 수 있으니 서둘러 확인해주세요.
              </p>
            </div>
            <div class="footer">
              <p>© 2024 전문가 매칭 플랫폼. All rights reserved.</p>
              <p>이 이메일은 자동으로 발송되었습니다.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    const text = `
      새로운 캠페인 매칭 알림
      
      안녕하세요 ${expertName}님,
      
      귀하의 전문 분야와 일치하는 새로운 캠페인이 등록되었습니다.
      
      캠페인: ${campaignTitle}
      
      자세한 내용 확인: ${campaignUrl}
      
      감사합니다.
      전문가 매칭 플랫폼
    `
    
    return { subject, html, text }
  }

  static proposalReceived({
    organizationName,
    expertName,
    campaignTitle,
    proposalUrl,
  }: {
    organizationName: string
    expertName: string
    campaignTitle: string
    proposalUrl: string
  }) {
    const subject = `📩 새로운 제안서가 도착했습니다: ${campaignTitle}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #F9FAFB; padding: 30px; border: 1px solid #E5E7EB; }
            .button { display: inline-block; padding: 12px 24px; background: #10B981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6B7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>새로운 제안서 도착</h1>
            </div>
            <div class="content">
              <p>안녕하세요 ${organizationName} 담당자님,</p>
              <p><strong>${expertName}</strong> 전문가님이 "${campaignTitle}" 캠페인에 제안서를 제출했습니다.</p>
              
              <div style="text-align: center;">
                <a href="${proposalUrl}" class="button">제안서 확인하기</a>
              </div>
              
              <p style="color: #6B7280; font-size: 14px;">
                제안서를 검토하고 전문가와 직접 소통하실 수 있습니다.
              </p>
            </div>
            <div class="footer">
              <p>© 2024 전문가 매칭 플랫폼. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    const text = `
      새로운 제안서 도착
      
      안녕하세요 ${organizationName} 담당자님,
      
      ${expertName} 전문가님이 "${campaignTitle}" 캠페인에 제안서를 제출했습니다.
      
      제안서 확인: ${proposalUrl}
      
      감사합니다.
      전문가 매칭 플랫폼
    `
    
    return { subject, html, text }
  }

  static proposalStatus({
    expertName,
    campaignTitle,
    status,
    message,
  }: {
    expertName: string
    campaignTitle: string
    status: 'accepted' | 'rejected'
    message?: string
  }) {
    const isAccepted = status === 'accepted'
    const subject = isAccepted 
      ? `✅ 제안서가 승인되었습니다: ${campaignTitle}`
      : `📝 제안서 검토 결과: ${campaignTitle}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${isAccepted ? '#10B981' : '#6B7280'}; color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #F9FAFB; padding: 30px; border: 1px solid #E5E7EB; }
            .footer { padding: 20px; text-align: center; color: #6B7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>제안서 ${isAccepted ? '승인' : '검토 완료'}</h1>
            </div>
            <div class="content">
              <p>안녕하세요 ${expertName}님,</p>
              <p>"${campaignTitle}" 캠페인에 제출하신 제안서가 ${isAccepted ? '승인되었습니다!' : '검토되었습니다.'}</p>
              
              ${message ? `
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: #374151; margin: 0;"><strong>메시지:</strong></p>
                  <p style="color: #6B7280; margin: 10px 0 0 0;">${message}</p>
                </div>
              ` : ''}
              
              ${isAccepted ? `
                <p>축하합니다! 곧 담당자로부터 상세한 연락을 받으실 예정입니다.</p>
              ` : `
                <p>아쉽게도 이번 캠페인에는 선정되지 않았습니다. 다른 캠페인에도 많은 관심 부탁드립니다.</p>
              `}
            </div>
            <div class="footer">
              <p>© 2024 전문가 매칭 플랫폼. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    const text = `
      제안서 ${isAccepted ? '승인' : '검토 완료'}
      
      안녕하세요 ${expertName}님,
      
      "${campaignTitle}" 캠페인에 제출하신 제안서가 ${isAccepted ? '승인되었습니다!' : '검토되었습니다.'}
      
      ${message ? `메시지: ${message}` : ''}
      
      감사합니다.
      전문가 매칭 플랫폼
    `
    
    return { subject, html, text }
  }

  static welcome({
    name,
    role,
    dashboardUrl,
  }: {
    name: string
    role: 'expert' | 'organization'
    dashboardUrl: string
  }) {
    const subject = '🎉 전문가 매칭 플랫폼에 오신 것을 환영합니다!'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); color: white; padding: 40px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #F9FAFB; padding: 30px; border: 1px solid #E5E7EB; }
            .button { display: inline-block; padding: 12px 24px; background: #667EEA; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6B7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>환영합니다! 🎉</h1>
            </div>
            <div class="content">
              <p>안녕하세요 ${name}님,</p>
              <p>전문가 매칭 플랫폼에 ${role === 'expert' ? '전문가' : '기관'}으로 가입해주셔서 감사합니다!</p>
              
              ${role === 'expert' ? `
                <h3>🚀 시작하기</h3>
                <ol>
                  <li>프로필을 완성하여 더 많은 기회를 받아보세요</li>
                  <li>관심 분야의 키워드를 등록하세요</li>
                  <li>매칭된 캠페인에 제안서를 제출하세요</li>
                </ol>
              ` : `
                <h3>🚀 시작하기</h3>
                <ol>
                  <li>기관 프로필을 완성해주세요</li>
                  <li>첫 캠페인을 생성하여 전문가를 찾아보세요</li>
                  <li>제안서를 검토하고 최적의 전문가를 선택하세요</li>
                </ol>
              `}
              
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button">대시보드로 이동</a>
              </div>
            </div>
            <div class="footer">
              <p>© 2024 전문가 매칭 플랫폼. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    const text = `
      환영합니다!
      
      안녕하세요 ${name}님,
      
      전문가 매칭 플랫폼에 가입해주셔서 감사합니다!
      
      대시보드로 이동: ${dashboardUrl}
      
      감사합니다.
      전문가 매칭 플랫폼
    `
    
    return { subject, html, text }
  }

  static passwordReset({
    name,
    resetUrl,
  }: {
    name: string
    resetUrl: string
  }) {
    const subject = '🔐 비밀번호 재설정 요청'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #EF4444; color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #F9FAFB; padding: 30px; border: 1px solid #E5E7EB; }
            .button { display: inline-block; padding: 12px 24px; background: #EF4444; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6B7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>비밀번호 재설정</h1>
            </div>
            <div class="content">
              <p>안녕하세요 ${name}님,</p>
              <p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새로운 비밀번호를 설정하세요.</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">비밀번호 재설정</a>
              </div>
              
              <p style="color: #6B7280; font-size: 14px;">
                * 이 링크는 24시간 동안 유효합니다.<br>
                * 요청하지 않으셨다면 이 이메일을 무시하세요.
              </p>
            </div>
            <div class="footer">
              <p>© 2024 전문가 매칭 플랫폼. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    const text = `
      비밀번호 재설정
      
      안녕하세요 ${name}님,
      
      비밀번호 재설정을 요청하셨습니다.
      
      재설정 링크: ${resetUrl}
      
      이 링크는 24시간 동안 유효합니다.
      
      감사합니다.
      전문가 매칭 플랫폼
    `
    
    return { subject, html, text }
  }
}