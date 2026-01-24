
class MasterChat {

    private url = `https://mastercheb.ru/chat`;
    private session = 'ce653735-a6cb-4a8f-a2b0-dfd738ae210b'
    private project = 'default';

    constructor() {
        // this.url = url
        // this.session = session
    }

    async query(message: string) {

        try {
            const response = await fetch(this.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    filters: {},
                    message: message,
                    project_id: this.project,
                    session_id: this.session
                }),
            });
            // const json = await response.json()
            // logger.log('response -', json)
            return response.text();
        } catch (error) {
            // logger.log('add to Spreadsheet err', error);
            throw error;
        }
    }
}

export default MasterChat;