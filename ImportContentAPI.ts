export class ImportContentAPI {

    public static async doImport(link: string, contentType?: string): Promise<void> {

        if (! isValidLink(link)) {
            console.warn("Link is not valid: " + link);
            return;
        }

        console.log("Sending link to polar: " + link);

        const url = 'http://localhost:8500/rest/v1/capture/trigger';

        const data: any = {
            link,
            contentType
        };

        return new Promise<void>((resolve, reject) => {

            // For some reason the fetch API doesn't work and we have to hse XHR
            // for this functionality.

            const xrequest = new XMLHttpRequest();
            xrequest.open("POST", url);

            xrequest.onload = () => {
                resolve();
            };

            xrequest.onerror = () => {
                reject("Request failed to: " + url);
            };

            xrequest.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            xrequest.send(JSON.stringify(data));

        });

    }

}
