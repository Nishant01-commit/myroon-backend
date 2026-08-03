export const wrapper = (bodyHtml: string): string => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#1e3a8a;padding:24px;text-align:center;">
                <span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:0.5px;">MyRoomm<span style="color:#d4af37;">.in</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#333333;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px;text-align:center;color:#9ca3af;font-size:12px;">
                &copy; ${new Date().getFullYear()} MyRoomm.in. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
