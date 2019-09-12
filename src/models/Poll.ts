import PollOption from "./PollOption";

export default interface Poll  {
    id?: number,
    name: string,
    pollOptions?: PollOption[]
}