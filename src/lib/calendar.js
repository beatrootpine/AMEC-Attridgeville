export function generateICS(event) {
  const pad = (n) => String(n).padStart(2, '0')

  const date = new Date(event.event_date + 'T' + (event.event_time || '08:00:00'))
  const endDate = new Date(date.getTime() + 8 * 60 * 60 * 1000) // 8 hours later

  const formatDate = (d) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AMEC Events//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(date)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.venue || ''} ${event.venue_address || ''}`.trim(),
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n').substring(0, 200)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${event.title.replace(/[^a-z0-9]/gi, '-')}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
