import { CosmosWrapper } from "./CosmosWrapper";
import { Stopwatch } from "./Stopwatch";

(async () => {

    const rusToConfigure = process.env.RUS ? parseInt(process.env.RUS) : 8000;
    const numberOfItems = process.env.NumberOfItems ? parseInt(process.env.NumberOfItems) : 5000;

    const waitFor = (n = 10000) => {
        return new Promise((res, reject) => {
            setTimeout(() => {
                res();
            }, n);
        });
    };

    const runSpTest = async (itemsToCreate: number, useUpsert: boolean, chunkSize = numberOfItems, ignoreErrors = false, items?: any[]) => {
        const sw = new Stopwatch();

        sw.restart();
        const rus = await client.performInsertUsingSp(itemsToCreate, useUpsert, ignoreErrors, items, chunkSize);
        sw.logElapsedTime(`${itemsToCreate}, RUs: ${Math.round(rus)}, SP-${useUpsert ? 'Upsert' : 'Create'}, ignoreErrors: ${ignoreErrors}, chunkSize: ${chunkSize}`);
        await waitFor();
    };

    const runParallelTest = async (itemsToCreate:number, maxParallelReq: number) => {
        const sw = new Stopwatch();
        sw.restart();
        let rus = await client.performInsertParallel(numberOfItems, maxParallelReq);
        sw.logElapsedTime(`${numberOfItems}, RUs: ${Math.round(rus)}, Parallel-${maxParallelReq}`);
        await waitFor();
    };

    const client = new CosmosWrapper(rusToConfigure);
    await client.Setup();
    
    // run parallel test with 40 threads
    await runParallelTest(numberOfItems, 40);
    
    // insert pre-chunked
    await runSpTest(numberOfItems, false, 2500);

    // insert not chunked (request too large roundtrip)
    await runSpTest(numberOfItems, false);

    const items = CosmosWrapper.createItems(numberOfItems);
    // re-insert items and ignore errors
    await runSpTest(numberOfItems, true, numberOfItems, false, items);
    await runSpTest(numberOfItems, false, numberOfItems, true, items);
})();