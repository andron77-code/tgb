import HTTPQuery from '../http';

class MasterChat {
  private url = `https://mastercheb.ru/chat`;
  private session = 'ce653735-a6cb-4a8f-a2b0-dfd738ae210b';
  private project = 'default';

  constructor() {
    // this.url = url
    // this.session = session
  }

  async query(message: string) {
    const response = await HTTPQuery.post(this.url, {
      headers: {
        'Content-Type': 'application/json',
        // Authorization: `Bearer ${accessToken}`,
      },
      body: {
        filters: {},
        message: message,
        project_id: this.project,
        session_id: this.session,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.data as string;
  }
}

export default MasterChat;
