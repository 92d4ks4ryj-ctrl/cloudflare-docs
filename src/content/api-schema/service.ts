import { Octokit } from "@octokit/rest";

export type GetContentRequest = Parameters<Octokit["repos"]["getContent"]>[0];

export class GitHubService {
	private readonly octokit: Octokit;

	public constructor(private readonly token?: string) {
		this.octokit = new Octokit({ auth: token });
	}

	/**
	 * @returns content of the given file in the given repo on the given commit.
	 */
	public async getFile(request: GetContentRequest) {
		const { data } = await this.octokit.repos.getContent(request);
		return data as unknown as string; // The GitHub types seem wrong for the raw header use case.
	}
}
