import { TextField, Button } from 'react-md';
import escapeRegex from 'escape-string-regexp';
import React from 'react';

// Components
import Navigation from 'components/reader/modal/Navigation';

export default class BookContentSearch extends React.Component {
  constructor(props) {
    super(props);

    this.state = { matches: [], searching: false, query: '' };
  }

  async componentWillMount() {
    const { Reader } = this.props;

    // Disable highlights so they don't mess with the search
    Reader.onSetHighlightMode({ mode: 'none' });

    const search = await localforage.getItem(`search-${Reader.state.book.id}`);

    if (!search) return;

    this.setState(search);
  }

  componentDidMount() {
    this._search.focus();
  }

  /** @param {string} cfi */
  onGoTo(cfi) {
    const { Reader } = this.props;
    const { state } = this;

    if (state.searching) return;

    Reader.book.rendition.display(cfi);
    Reader.onSetHighlightMode({ mode: 'search', search: state.query });
    Reader.onCloseModal();

    localforage.setItem(`search-${Reader.state.book.id}`, state);
  }

  async onSearch() {
    await new Promise(r => this.setState({ matches: [], searching: true }, r));

    if (!this.state.query.length) return this.setState({ searching: false });

    const { Reader } = this.props;
    const currentCFI = Reader.book.rendition.location.start.cfi;
    document.getElementById('bookView').style.display = 'none';
    document.querySelector('div.overlay').style.display = 'none';

    for (let item of Reader.book.spine.items) {
      await Reader.book.rendition.display(item.href);
      this._searchChapter();
    }

    await Reader.book.rendition.display(currentCFI);
    this.setState({ searching: false });
    document.getElementById('bookView').style.display = '';
    document.querySelector('div.overlay').style.display = '';
  }

  _searchChapter() {
    const { Reader } = this.props;
    const content = Reader.book.rendition.getContents()[0];
    const { query } = this.state;

    const matches = [];
    const search = new RegExp(escapeRegex(query), 'gi');
    const nodes = this._findMatchingNodes(content.content, search);

    for (let node of nodes) {
      const indexes = [];
      const text = node.innerText;
      let match;

      // Node's text may have multiple matches
      while ((match = search.exec(text))) {
        indexes.push(match.index);
      }

      for (let start of indexes) {
        const end = start + query.length;

        const match = {
          before: text.substring(0, start),
          match: text.substring(start, end),
          after: text.substring(end),
          cfi: content.cfiFromNode(node)
        };

        // Limit `before` and `after` to 100 characters
        match.before =
          match.before.length > 100
            ? '...' + match.before.substr(match.before.length - 100)
            : match.before;
        match.after =
          match.after.length > 100
            ? match.after.substr(0, 100) + '...'
            : match.after;

        matches.push(match);
      }
    }

    this.setState({ matches: this.state.matches.concat(matches) });
  }

  /**
   * Recursively calls itself to find the deepest possible nodes whose
   *  `innerText` property matches the search.
   * @param {Node} node
   * @param {RegExp} search
   * @return {Node[]}
   */
  _findMatchingNodes(node, search) {
    if (!search.test(node.innerText)) return [];

    let matches = [node];

    for (let child of node.childNodes) {
      matches = matches.concat(this._findMatchingNodes(child, search));
    }

    // Remove parent node, since children contain matches
    if (matches.length > 1) matches.shift();

    return matches;
  }

  render() {
    const { query, matches, searching } = this.state;

    return (
      <section className="book-content-search">
        <Navigation {...this.props} title="Search" />

        <div className="search">
          <TextField
            block
            paddedBlock
            id="search--search"
            ref={i => (this._search = i)}
            type="search"
            value={searching ? 'Searching...' : query}
            disabled={searching}
            onChange={v => this.setState({ query: v })}
            onKeyPress={e => e.key == 'Enter' && this.onSearch()}
            placeholder="Search"
          />
          <Button
            icon
            primary
            onClick={() => this.onSearch()}
            iconChildren="search"
          />
        </div>

        <ul className="matches">
          {matches.map((match, i) => (
            <li
              key={i}
              onClick={() => this.onGoTo(match.cfi)}
              className="match"
            >
              <span className="before">{match.before}</span>
              <span className="match">{match.match}</span>
              <span className="after">{match.after}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }
}
